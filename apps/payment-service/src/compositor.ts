import type { FastifyHttpServerInstance } from '@workspace/fastify';

import { PgDrizzleClient } from '@workspace/drizzle-pg';
import { HttpErrorHelper } from '@workspace/http';
import { FastifyServer, FastifyErrorHandler } from '@workspace/fastify';
import { KafkaClient } from '@workspace/kafka';
import {
    postgresDbSchema,
    FastifyHttpPaymentController,
    FastifyHttpHealthController,
    KafkaPaymentProviderEventConsumer,
    PostgresPaymentRepository,
    PostgresPaymentEventRepository,
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
): Promise<{ httpServer: FastifyHttpServerInstance; eventConsumers: { startConsume: () => Promise<void> }[] }> {
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
    const postgresPaymentEventRepository = new PostgresPaymentEventRepository(dbInstance);

    const paymentService = new PaymentService(postgresPaymentRepository, paymentProviderGatewayResolver);
    const paymentEventService = new PaymentEventService(postgresPaymentRepository, postgresPaymentEventRepository);

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
    const httpHealthController = new FastifyHttpHealthController(httpServer);
    httpPaymentController.addRoutes();
    httpHealthController.addRoutes();

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

    return { httpServer, eventConsumers: [kafkaPaymentProviderEventConsumer] };
}
