import type { Consumer, EachMessagePayload, Producer } from 'kafkajs';
import type { PaymentEventService, PaymentEventMapperResolver } from '../../application';

import { logger } from '@workspace/logger';
import { ConflictError, NotFoundError, ValidationError } from '@workspace/errors';
import { paymentProviderEventDtoSchema } from '@workspace/payment';

type DeadLetterConfig = {
    producer: Producer;
    topic: string;
};

type DeadLetterContext = {
    kafkaMessageId: string;
    sourceTopic: string;
    partition: number;
    offset: string;
    key: Buffer | null;
    rawValue: Buffer | null;
};

type KafkaPaymentProviderEventConsumerOptions = {
    kafkaConsumer: Consumer;
    paymentEventService: PaymentEventService;
    paymentEventMapperResolver: PaymentEventMapperResolver;
    retryAttempts: number;
    retryBaseDelayMs: number;
    deadLetterConfig?: DeadLetterConfig;
};

class KafkaPaymentProviderEventConsumer {
    private readonly kafkaConsumer: Consumer;
    private readonly paymentEventService: PaymentEventService;
    private readonly paymentEventMapperResolver: PaymentEventMapperResolver;
    private readonly retryAttempts: number;
    private readonly retryBaseDelayMs: number;
    private readonly deadLetter?: DeadLetterConfig;

    constructor(options: KafkaPaymentProviderEventConsumerOptions) {
        this.kafkaConsumer = options.kafkaConsumer;
        this.paymentEventService = options.paymentEventService;
        this.paymentEventMapperResolver = options.paymentEventMapperResolver;
        this.retryAttempts = options.retryAttempts;
        this.retryBaseDelayMs = options.retryBaseDelayMs;
        this.deadLetter = options.deadLetterConfig;
    }

    private buildKafkaMessageId(topic: string, partition: number, offset: string): string {
        return `${topic}:${partition}:${offset}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private parseProviderEventMessage(eventMessage: string, kafkaMessageId: string) {
        let jsonParsedEventMessage: unknown;

        try {
            jsonParsedEventMessage = JSON.parse(eventMessage);
        } catch (error) {
            void error;

            throw new ValidationError(
                `Invalid payment provider event-message: ${eventMessage} is not a valid JSON`,
            );
        }

        const parsedEvent = paymentProviderEventDtoSchema.safeParse(jsonParsedEventMessage);

        if (!parsedEvent.success) {
            throw new ValidationError(
                `Invalid payment provider event-message: ${parsedEvent.error.message} for message: ${eventMessage}`,
            );
        }

        const eventProviderMapperFunction = this.paymentEventMapperResolver.resolve(parsedEvent.data.provider);

        logger.info(
            {
                kafkaMessageId,
            },
            'Validates payment provider event message',
        );

        return eventProviderMapperFunction(parsedEvent.data);
    }

    private async sendDeadLetter(context: DeadLetterContext, error: unknown, attempts: number): Promise<void> {
        if (!this.deadLetter) {
            logger.error(
                {
                    ...context,
                    err: error,
                    attempts,
                },
                'Dead letter queue not configured; message dropped after failed retries',
            );

            return;
        }

        const dlqPayload = {
            sourceTopic: context.sourceTopic,
            partition: context.partition,
            offset: context.offset,
            kafkaMessageId: context.kafkaMessageId,
            key: context.key?.toString('utf8') ?? null,
            value: context.rawValue?.toString('utf8') ?? null,
            attempts,
            errorName: error instanceof Error ? error.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : String(error),
        };

        try {
            await this.deadLetter.producer.send({
                topic: this.deadLetter.topic,
                messages: [
                    {
                        key: context.kafkaMessageId,
                        value: JSON.stringify(dlqPayload),
                    },
                ],
            });
        } catch (sendError) {
            logger.error(
                {
                    ...context,
                    err: sendError,
                    originalError: error,
                },
                'Failed to publish payment provider event to dead letter topic',
            );
        }
    }

    private async processHandleWithRetry(
        fn: () => Promise<void>,
        dlContext: DeadLetterContext,
    ): Promise<void> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                await fn();

                return;
            } catch (error) {
                if (error instanceof ValidationError || error instanceof ConflictError) {
                    throw error;
                }

                lastError = error;

                logger.warn(
                    {
                        kafkaMessageId: dlContext.kafkaMessageId,
                        attempt,
                        maxAttempts: this.retryAttempts,
                        err: error,
                    },
                    'Retrying payment provider event handling',
                );

                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryBaseDelayMs * 2 ** (attempt - 1));
                }
            }
        }

        await this.sendDeadLetter(dlContext, lastError, this.retryAttempts);

        logger.error(
            {
                kafkaMessageId: dlContext.kafkaMessageId,
                partition: dlContext.partition,
                offset: dlContext.offset,
                err: lastError,
            },
            'Payment provider event moved to dead letter queue after retries',
        );
    }

    private async handleMessage(payload: EachMessagePayload): Promise<void> {
        const { topic, partition, message } = payload;
        const kafkaMessageId = this.buildKafkaMessageId(topic, partition, message.offset);

        logger.info(
            {
                kafkaMessageId,
            },
            'Consuming payment provider event message',
        );

        const eventMessage = message.value?.toString();

        if (!eventMessage) {
            throw new ValidationError('Empty payment provider event-message');
        }

        const { paymentEvent, paymentData } = this.parseProviderEventMessage(eventMessage, kafkaMessageId);

        await this.processHandleWithRetry(
            async () => {
                await this.paymentEventService.handlePaymentEvent(paymentEvent, paymentData);
            },
            {
                kafkaMessageId,
                sourceTopic: topic,
                partition,
                offset: message.offset,
                key: message.key,
                rawValue: message.value ?? null,
            },
        );

        logger.info(
            {
                kafkaMessageId,
            },
            'Processed payment provider event message',
        );
    }

    public async startConsume(): Promise<void> {
        await this.kafkaConsumer.run({
            eachMessage: async (payload) => {
                const { topic, partition, message } = payload;

                try {
                    await this.handleMessage(payload);
                } catch (error) {
                    if (error instanceof ValidationError) {
                        logger.error(
                            { topic, partition, offset: message.offset },
                            `Validation error consuming payment provider event: ${error.message}`,
                        );

                        return;
                    }

                    if (error instanceof ConflictError) {
                        logger.info(
                            { topic, partition, offset: message.offset },
                            `Conflict error consuming payment provider event: ${error.message}`,
                        );

                        return;
                    }

                    if (error instanceof NotFoundError) {
                        logger.info(
                            { topic, partition, offset: message.offset },
                            `Not found consuming payment provider event: ${error.message}`,
                        );

                        return;
                    }

                    logger.error(
                        { topic, partition, offset: message.offset, err: error },
                        'Unexpected error consuming payment provider event outside retry scope',
                    );
                }
            },
        });
    }
}

export default KafkaPaymentProviderEventConsumer;
export { KafkaPaymentProviderEventConsumer };
