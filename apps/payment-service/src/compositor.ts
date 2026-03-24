import { PgDrizzleClient } from '@workspace/drizzle-pg';
import { KafkaClient } from '@workspace/kafka';
import {
    postgresDbSchema,
    createHttpServer,
    HttpPaymentController,
    KafkaPaymentProviderEventConsumer,
    PostgresPaymentRepository,
    PostgresPaymentEventRepository,
    StripePaymentProviderGateway,
    StripePaymentEventMapper,
    PaymentProviderGatewayResolverAdapter,
    PaymentEventMapperResolverAdapter
} from './adapters';
import { PaymentEventService, PaymentService } from './application';

export type ComposeOptions = {
    privateStripeKey: string;
    databaseUrl: string;
    kafkaBrokers: string[];
    httpServerPort: number;
    httpServerHost: string;
};

export async function compose(options: ComposeOptions): Promise<{ httpServer: Awaited<ReturnType<typeof createHttpServer>>, eventConsumers: { startConsume: () => Promise<void> }[] }> {
    const { privateStripeKey, databaseUrl, kafkaBrokers, httpServerPort, httpServerHost } = options;

    const pgClient = new PgDrizzleClient(databaseUrl, { ...postgresDbSchema })
    const dbInstance = pgClient.getDbInstance();

    const stripePaymentProviderGateway = new StripePaymentProviderGateway(privateStripeKey);
    const stripePaymentEventMapper = new StripePaymentEventMapper();

    const paymentProviderGatewayResolver = new PaymentProviderGatewayResolverAdapter(new Map([
        ['stripe', stripePaymentProviderGateway],
    ]));

    const paymentEventMapperResolver = new PaymentEventMapperResolverAdapter(new Map([
        ['stripe', stripePaymentEventMapper.toPaymentProviderEvent],
    ]));
    
    const postgresPaymentRepository = new PostgresPaymentRepository(dbInstance);
    const postgresPaymentEventRepository = new PostgresPaymentEventRepository(dbInstance);
    
    const paymentService = new PaymentService(postgresPaymentRepository, paymentProviderGatewayResolver);
    const paymentEventService = new PaymentEventService(postgresPaymentRepository, postgresPaymentEventRepository);

    
    const httpServer = await createHttpServer(httpServerPort, httpServerHost);
    const httpPaymentController = new HttpPaymentController(httpServer, paymentService);
    httpPaymentController.addRoutes();
    
    const kafkaClient = new KafkaClient({ brokers: kafkaBrokers, clientId: 'payment-service' })
    const consumer = await kafkaClient.getConsumer('payment-service', 'payment-events')
    
    const kafkaPaymentProviderEventConsumer = new KafkaPaymentProviderEventConsumer(consumer, paymentEventService, paymentEventMapperResolver);

    return { httpServer, eventConsumers: [kafkaPaymentProviderEventConsumer] };
}
