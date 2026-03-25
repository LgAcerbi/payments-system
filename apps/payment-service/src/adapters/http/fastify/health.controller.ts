import type { FastifyHttpServerInstance } from '@workspace/fastify';

import { z } from 'zod';

class FastifyHttpHealthController {
    constructor(private readonly server: FastifyHttpServerInstance) {}

    public addRoutes() {
        this.server.route({
            method: 'GET',
            url: '/health',
            schema: {
                response: {
                    200: z.object({ status: z.literal('ok') }),
                },
            },
            handler: async (request, reply) => {
                return reply.status(200).send({ status: 'ok' });
            },
        });
    }
}

export default FastifyHttpHealthController;
export { FastifyHttpHealthController };
