import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
} from 'fastify-type-provider-zod';
import { logger } from '@workspace/logger';

export const createHttpServer = async (port: number, host: string) => {
    const app = Fastify({
        loggerInstance: logger.child({ service: 'payment-service' }),
        trustProxy: true,
    }).withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(cors);

    await app.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Payment Service',
                description: 'API documentation',
                version: '1.0.0',
            },
            servers: [
                { url: `http://${host}:${port}`, description: 'Development' },
            ],
        },
        transform: jsonSchemaTransform,
    });

    await app.register(swaggerUi, {
        routePrefix: '/docs',
    });

    return app;
};
