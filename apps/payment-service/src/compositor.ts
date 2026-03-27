import type { FastifyHttpServerInstance } from '@workspace/fastify';

import { PgDrizzleClient } from '@workspace/drizzle-pg';
import { HttpErrorHelper } from '@workspace/http';
import { FastifyServer, FastifyErrorHandler } from '@workspace/fastify';
import { KafkaClient } from '@workspace/kafka';
import { logger } from '@workspace/logger';
import {
    postgresDbSchema,
    FastifyHttpPaymentController,
    FastifyHttpHealthController,
    KafkaPaymentProviderEventConsumer,
    PostgresPaymentRepository,
    PostgresPaymentUnitOfWork,
    StripePaymentProviderGateway,
    StripePaymentEventMapper,
    PaymentProviderGatewayResolverAdapter,
    PaymentEventMapperResolverAdapter,
} from './adapters';
import { PaymentEventService, PaymentService } from './application';

export type ComposeOptions = {
    privateStripeKey: string;
    databaseUrl: string;
    kafkaBrokers: string[];
    httpServerPort: number;
    httpServerHost: string;
    httpRateLimitMax: number;
    httpRateLimitTimeWindow: string;
    messagingRetryAttempts: number;
    messagingRetryBaseDelayMs: number;
};

export async function compose(
    options: ComposeOptions,
): Promise<{
    httpServer: FastifyHttpServerInstance;
    eventConsumers: { startConsume: () => Promise<void>; stopConsume: () => Promise<void> }[];
    shutdown: () => Promise<void>;
}> {
    const {
        privateStripeKey,
        databaseUrl,
        kafkaBrokers,
        httpServerPort,
        httpServerHost,
        httpRateLimitMax,
        httpRateLimitTimeWindow,
        messagingRetryAttempts,
        messagingRetryBaseDelayMs,
    } = options;

    const pgClient = new PgDrizzleClient(databaseUrl, { ...postgresDbSchema });
    const dbInstance = pgClient.getDbInstance();

    const stripePaymentProviderGateway = new StripePaymentProviderGateway(privateStripeKey);
    const stripePaymentEventMapper = new StripePaymentEventMapper();

    const paymentProviderGatewayResolver = new PaymentProviderGatewayResolverAdapter(
        new Map([['stripe', stripePaymentProviderGateway]]),
    );

    const paymentEventMapperResolver = new PaymentEventMapperResolverAdapter(
        new Map([['stripe', stripePaymentEventMapper.toPaymentProviderEvent]]),
    );

    const postgresPaymentRepository = new PostgresPaymentRepository(dbInstance);

    const paymentService = new PaymentService(postgresPaymentRepository, paymentProviderGatewayResolver);
    const postgresPaymentUnitOfWork = new PostgresPaymentUnitOfWork(dbInstance);
    const paymentEventService = new PaymentEventService(postgresPaymentUnitOfWork);

    const kafkaClient = new KafkaClient({ brokers: kafkaBrokers, clientId: 'payment-service' });
    const consumer = await kafkaClient.getConsumer('payment-service', 'payment-events');
    const producer = await kafkaClient.getProducer();
    const deadLetterConfig = {
        producer,
        topic: 'payment-events-dead-letter',
    };

    const kafkaPaymentProviderEventConsumer = new KafkaPaymentProviderEventConsumer({
        kafkaConsumer: consumer,
        paymentEventService,
        paymentEventMapperResolver,
        retryAttempts: messagingRetryAttempts,
        retryBaseDelayMs: messagingRetryBaseDelayMs,
        deadLetterConfig,
    });

    const httpErrorHelper = new HttpErrorHelper({
        urnNamespace: 'urn:payment-service:problem:',
    });

    const httpRateLimit = {
        max: httpRateLimitMax,
        timeWindow: httpRateLimitTimeWindow,
    };
    const httpErrorHandler = new FastifyErrorHandler(httpErrorHelper);
    const httpServer = await new FastifyServer(
        httpServerPort,
        httpServerHost,
        httpRateLimit,
        'Payment Service',
        httpErrorHandler,
    ).start();
    const httpPaymentController = new FastifyHttpPaymentController(httpServer, paymentService);
    const httpHealthController = new FastifyHttpHealthController(httpServer, consumer, pgClient);
    httpPaymentController.addRoutes();
    httpHealthController.addRoutes();

    let isShuttingDown = false;

    const shutdown = async (): Promise<void> => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        const shutdownErrors: Error[] = [];

        try {
            for (const eventConsumer of [kafkaPaymentProviderEventConsumer]) {
                await eventConsumer.stopConsume();
            }
        } catch (error) {
            shutdownErrors.push(error instanceof Error ? error : new Error(String(error)));
            logger.error({ err: error }, 'Failed to stop Kafka consumers during shutdown');
        }

        try {
            await producer.disconnect();
        } catch (error) {
            shutdownErrors.push(error instanceof Error ? error : new Error(String(error)));
            logger.error({ err: error }, 'Failed to disconnect Kafka producer during shutdown');
        }

        try {
            await httpServer.close();
        } catch (error) {
            shutdownErrors.push(error instanceof Error ? error : new Error(String(error)));
            logger.error({ err: error }, 'Failed to close HTTP server during shutdown');
        }

        try {
            await pgClient.close();
        } catch (error) {
            shutdownErrors.push(error instanceof Error ? error : new Error(String(error)));
            logger.error({ err: error }, 'Failed to close database client during shutdown');
        }

        if (shutdownErrors.length > 0) {
            throw new Error(
                `Shutdown completed with ${shutdownErrors.length} error(s): ${shutdownErrors.map((error) => error.message).join('; ')}`,
            );
        }
    };

    return { httpServer, eventConsumers: [kafkaPaymentProviderEventConsumer], shutdown };
}
