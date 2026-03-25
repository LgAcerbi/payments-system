import "dotenv/config"
import { logger } from "@workspace/logger"
import { compose } from "./compositor"

async function main() {
    const {
        PRIVATE_STRIPE_KEY,
        DATABASE_URL,
        KAFKA_BROKERS,
        HOST = "0.0.0.0",
        PORT = 80,
        MESSAGING_RETRY_ATTEMPTS = 3,
        MESSAGING_RETRY_BASE_DELAY_MS = 400,
    } = process.env

    if (!PRIVATE_STRIPE_KEY) {
        logger.error("PRIVATE_STRIPE_KEY is required")
        process.exit(1)
    }

    if (!DATABASE_URL) {
        logger.error("DATABASE_URL is required")
        process.exit(1)
    }

    if (!KAFKA_BROKERS) {
        logger.error("KAFKA_BROKERS is required")
        process.exit(1)
    }

    const port = Number(PORT)
    const kafkaBrokers = KAFKA_BROKERS.split(",").map((broker) => broker.trim()).filter(Boolean)

    if (kafkaBrokers.length === 0) {
        logger.error("KAFKA_BROKERS must include at least one broker")
        process.exit(1)
    }

    const { httpServer, eventConsumers } = await compose({
        privateStripeKey: PRIVATE_STRIPE_KEY,
        databaseUrl: DATABASE_URL,
        kafkaBrokers,
        httpServerPort: port,
        httpServerHost: HOST,
        messagingRetryAttempts: Number(MESSAGING_RETRY_ATTEMPTS),
        messagingRetryBaseDelayMs: Number(MESSAGING_RETRY_BASE_DELAY_MS),
    })

    for (const eventConsumer of eventConsumers) {
        await eventConsumer.startConsume()
    }

    httpServer.listen({ port, host: HOST }, (err: Error | null, address: string) => {
        if (err) {
            httpServer.log.error(err)
            process.exit(1)
        }
        logger.info(`payment-service running on ${address}`)
    })
}

main()