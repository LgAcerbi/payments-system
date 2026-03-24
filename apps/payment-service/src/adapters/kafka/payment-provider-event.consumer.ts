import type { Consumer } from 'kafkajs';
import type { PaymentEventService } from '../../application';

import { logger } from '@workspace/logger';
import { ValidationError, ConflictError } from '@workspace/errors';
import { paymentProviderEventDtoSchema } from '@workspace/payment';
import { StripePaymentEventMapper } from '../stripe/stripe-payment-event.mapper';

const eventProviderMapperFunctionMap = new Map([['stripe', StripePaymentEventMapper.toPaymentProviderEvent]]);

class PaymentProviderEventConsumer {
    constructor(
        private readonly kafkaConsumer: Consumer,
        private readonly paymentEventService: PaymentEventService,
    ) {}

    private buildKafkaMessageId(topic: string, partition: number, offset: string): string {
        return `${topic}:${partition}:${offset}`;
    }

    public async startConsume(): Promise<void> {
        await this.kafkaConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
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

                    let jsonParsedEventMessage: unknown;

                    try {
                        jsonParsedEventMessage = JSON.parse(eventMessage);
                    } catch (error) {
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

                    const eventProviderMapperFunction = eventProviderMapperFunctionMap.get(parsedEvent.data.provider);

                    if (!eventProviderMapperFunction) {
                        throw new ValidationError(`Invalid payment provider: ${parsedEvent.data.provider}`);
                    }

                    const providerPaymentEvent = eventProviderMapperFunction(parsedEvent.data);

                    logger.info(
                        {
                            kafkaMessageId,
                        },
                        'Validates payment provider event message',
                    );

                    await this.paymentEventService.handlePaymentEvent(providerPaymentEvent);

                    logger.info(
                        {
                            kafkaMessageId,
                        },
                        'Processed payment provider event message',
                    );
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

                    logger.error(
                        { topic, partition, offset: message.offset },
                        `Unknown error consuming payment provider event`,
                    );
                }
            },
        });
    }
}

export default PaymentProviderEventConsumer;
export { PaymentProviderEventConsumer };
