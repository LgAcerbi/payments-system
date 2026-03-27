import 'dotenv/config';
import { logger } from '@workspace/logger';
import { compose } from './compositor';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function main() {
    const {
        PRIVATE_STRIPE_KEY,
        DATABASE_URL,
        KAFKA_BROKERS,
        HTTP_HOST = '0.0.0.0',
        HTTP_PORT = 80,
        HTTP_RATE_LIMIT_MAX = 10000,
        HTTP_RATE_LIMIT_TIME_WINDOW = '1m',
        MESSAGING_RETRY_ATTEMPTS = 3,
        MESSAGING_RETRY_BASE_DELAY_MS = 400,
    } = process.env;

    if (!PRIVATE_STRIPE_KEY) {
        logger.error('PRIVATE_STRIPE_KEY is required');
        process.exit(1);
    }

    if (!DATABASE_URL) {
        logger.error('DATABASE_URL is required');
        process.exit(1);
    }

    if (!KAFKA_BROKERS) {
        logger.error('KAFKA_BROKERS is required');
        process.exit(1);
    }

    const httpPort = Number(HTTP_PORT);
    const kafkaBrokers = KAFKA_BROKERS.split(',')
        .map((broker) => broker.trim())
        .filter(Boolean);

    if (kafkaBrokers.length === 0) {
        logger.error('KAFKA_BROKERS must include at least one broker');
        process.exit(1);
    }

    const { httpServer, eventConsumers, shutdown } = await compose({
        privateStripeKey: PRIVATE_STRIPE_KEY,
        databaseUrl: DATABASE_URL,
        kafkaBrokers,
        httpServerPort: httpPort,
        httpServerHost: HTTP_HOST,
        httpRateLimitMax: Number(HTTP_RATE_LIMIT_MAX),
        httpRateLimitTimeWindow: HTTP_RATE_LIMIT_TIME_WINDOW,
        messagingRetryAttempts: Number(MESSAGING_RETRY_ATTEMPTS),
        messagingRetryBaseDelayMs: Number(MESSAGING_RETRY_BASE_DELAY_MS),
    });

    let isShuttingDown = false;

    const shutdownWithTimeout = async (reason: string, successExitCode: number): Promise<void> => {
        if (isShuttingDown) {
            logger.warn({ reason }, 'Graceful shutdown already in progress');

            return;
        }

        isShuttingDown = true;
        logger.info({ reason }, 'Starting graceful shutdown');

        try {
            await Promise.race([
                shutdown(),
                new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Graceful shutdown timeout after ${SHUTDOWN_TIMEOUT_MS}ms`));
                    }, SHUTDOWN_TIMEOUT_MS);
                }),
            ]);

            logger.info({ reason }, 'Graceful shutdown completed');
            process.exit(successExitCode);
        } catch (error) {
            logger.error({ err: error, reason }, 'Graceful shutdown failed');
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => {
        void shutdownWithTimeout('SIGTERM', 0);
    });

    process.on('SIGINT', () => {
        void shutdownWithTimeout('SIGINT', 0);
    });

    process.on('uncaughtException', (error) => {
        logger.error({ err: error }, 'Uncaught exception');
        void shutdownWithTimeout('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.error({ reason }, 'Unhandled promise rejection');
        void shutdownWithTimeout('unhandledRejection', 1);
    });

    for (const eventConsumer of eventConsumers) {
        await eventConsumer.startConsume();
    }

    httpServer.listen({ port: httpPort, host: HTTP_HOST }, (err: Error | null, address: string) => {
        if (err) {
            httpServer.log.error(err);
            void shutdownWithTimeout('http-server-listen-error', 1);

            return;
        }
        logger.info(`payment-service running on ${address}`);
    });
}

main().catch((error) => {
    logger.error({ err: error }, 'Failed to start payment-service');
    process.exit(1);
});
