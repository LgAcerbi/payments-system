import type { FastifyHttpServerInstance } from '@workspace/fastify';
import type { Consumer } from 'kafkajs';
import type { PgDrizzleClient } from '@workspace/drizzle-pg';

import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { logger } from '@workspace/logger';

class FastifyHttpHealthController {
    constructor(
        private readonly server: FastifyHttpServerInstance,
        private readonly kafkaConsumer: Consumer,
        private readonly dbClient: PgDrizzleClient<{ [key: string]: object }>,
    ) {}

    private async isConsumerHealthy(): Promise<boolean> {
        const groupDescription = await this.kafkaConsumer.describeGroup();

        const healthyStates = new Set(['Stable', 'PreparingRebalance', 'CompletingRebalance']);

        if (!healthyStates.has(groupDescription.state)) {
            logger.error({ groupDescription }, 'Kafka consumer is not healthy');
            return false;
        }

        return true;
    }

    private async isDatabaseHealthy(): Promise<boolean> {
        try {
            await this.dbClient.getDbInstance().execute(sql`SELECT 1`);
        } catch (error) {
            logger.error({ error }, 'Database is not healthy');
            return false;
        }

        return true;
    }

    public addRoutes() {
        this.server.route({
            method: 'GET',
            url: '/health',
            schema: {
                response: {
                    200: z.object({ status: z.literal('ok') }),
                    500: z.object({ status: z.literal('unhealthy') }),
                },
            },
            handler: async (request, reply) => {
                const isConsumerHealthy = await this.isConsumerHealthy();
                const isDatabaseHealthy = await this.isDatabaseHealthy();

                if (!isConsumerHealthy || !isDatabaseHealthy) {
                    return reply.status(500).send({ status: 'unhealthy' });
                }

                return reply.status(200).send({ status: 'ok' });
            },
        });
    }
}

export default FastifyHttpHealthController;
export { FastifyHttpHealthController };
