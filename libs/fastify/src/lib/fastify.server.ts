import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import cors from '@fastify/cors';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { Utils } from '@workspace/utils';
import { logger } from '@workspace/logger';
import { FastifyErrorHandler } from './fastify-error.handler.js';

class FastifyServer {
    constructor(
        private readonly port: number,
        private readonly host: string,
        private readonly serviceName: string,
        private readonly errorHandler: FastifyErrorHandler,
    ) {}

    public async start() {
        const app = Fastify({
            loggerInstance: logger.child({ service: Utils.toKebabCase(this.serviceName) }),
            trustProxy: true,
        }).withTypeProvider<ZodTypeProvider>();

        app.setValidatorCompiler(validatorCompiler);
        app.setSerializerCompiler(serializerCompiler);

        await app.register(cors);

        await app.register(swagger, {
            openapi: {
                openapi: '3.0.0',
                info: {
                    title: this.serviceName,
                    description: 'API documentation',
                    version: '1.0.0',
                },
                servers: [{ url: `http://${this.host}:${this.port}`, description: 'Development' }],
            },
            transform: jsonSchemaTransform,
        });

        await app.register(swaggerUi, {
            routePrefix: '/docs',
        });

        app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => this.errorHandler.handle(error, request, reply));

        return app;
    }
}

type FastifyHttpServerInstance = Awaited<ReturnType<InstanceType<typeof FastifyServer>['start']>>;

export default FastifyServer;
export { FastifyServer };
export type { FastifyHttpServerInstance };
