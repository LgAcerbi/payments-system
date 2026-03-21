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
    } = process.env

    if (!PRIVATE_STRIPE_KEY) {
        throw new Error("PRIVATE_STRIPE_KEY is required")
    }

    if (!DATABASE_URL) {
        throw new Error("DATABASE_URL is required")
    }

    if (!KAFKA_BROKERS) {
        throw new Error("KAFKA_BROKERS is required")
    }

    const port = Number(PORT)
    const kafkaBrokers = KAFKA_BROKERS.split(",").map((broker) => broker.trim()).filter(Boolean)

    if (kafkaBrokers.length === 0) {
        throw new Error("KAFKA_BROKERS must include at least one broker")
    }

    const { httpServer } = await compose({
        privateStripeKey: PRIVATE_STRIPE_KEY,
        databaseUrl: DATABASE_URL,
        kafkaBrokers,
        httpServerPort: port,
    })

    httpServer.listen({ port, host: HOST }, (err: Error | null, address: string) => {
        if (err) {
            httpServer.log.error(err)
            process.exit(1)
        }
        logger.info(`payment-service running on ${address}`)
    })
}

main()