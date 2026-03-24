import type { createHttpServer } from './server';
import type { PaymentService } from '../../application';

import { z } from 'zod';
import { httpErrorSchema } from '@workspace/http';

const paymentStatusSchema = z.enum(['initiated', 'processing', 'succeeded', 'failed', 'canceled']);

const paymentResponseSchema = z.object({
    id: z.uuid(),
    amount: z
        .number()
        .int()
        .describe('Amount in the smallest unit of currency (e.g. cents for USD).'),
    description: z.string().nullable(),
    amountRefunded: z.number().int().nullable(),
    currency: z.string(),
    status: paymentStatusSchema,
    orderId: z.string(),
    method: z.string(),
    provider: z.enum(['stripe']),
    providerPaymentId: z.string(),
    providerData: z.unknown(),
    idempotencyKey: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

const createPaymentBodySchema = z.object({
    payment: z.object({
        amount: z
            .number()
            .int()
            .describe(
                'Amount in the smallest unit of currency (e.g. cents for USD). Consumers format for display.',
            ),
        currency: z.string(),
        orderId: z.string(),
        method: z.string(),
        provider: z.enum(['stripe']),
        description: z.string().nullable(),
    }),
    idempotencyKey: z.string(),
});

class HttpPaymentController {
    constructor(
        private readonly server: Awaited<ReturnType<typeof createHttpServer>>,
        private readonly paymentService: PaymentService,
    ) {}

    public addRoutes() {
        this.server.route({
            method: 'POST',
            url: '/payments',
            schema: {
                body: createPaymentBodySchema,
                response: {
                    201: z.object({ id: z.uuid() }),
                    400: httpErrorSchema,
                    404: httpErrorSchema,
                    409: httpErrorSchema,
                    500: httpErrorSchema,
                },
            },
            handler: async (request, reply) => {
                const payment = await this.paymentService.createPayment(
                    request.body.payment,
                    request.body.idempotencyKey,
                );

                return reply.status(201).send({ id: payment.id });
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/:id',
            schema: {
                params: z.object({ id: z.uuid() }),
                response: {
                    200: paymentResponseSchema,
                    404: httpErrorSchema,
                    500: httpErrorSchema,
                },
            },
            handler: async (request, reply) => {
                const payment = await this.paymentService.getPaymentById(request.params.id);

                return reply.status(200).send(payment);
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/provider/:provider/id/:providerPaymentId',
            schema: {
                params: z.object({ provider: z.enum(['stripe']), providerPaymentId: z.string() }),
                response: {
                    200: paymentResponseSchema,
                    404: httpErrorSchema,
                    500: httpErrorSchema,
                },
            },
            handler: async (request, reply) => {
                const payment = await this.paymentService.getPaymentByProviderPaymentId(request.params.providerPaymentId, request.params.provider);

                return reply.status(200).send(payment);
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/order/:orderId',
            schema: {
                params: z.object({ orderId: z.string() }),
                response: {
                    200: paymentResponseSchema,
                    404: httpErrorSchema,
                    500: httpErrorSchema,
                },
            },
            handler: async (request, reply) => {
                const payment = await this.paymentService.getPaymentByOrderId(request.params.orderId);

                return reply.status(200).send(payment);
            },
        });

        this.server.route({
            method: 'POST',
            url: '/payments/:id/confirm',
            schema: {
                params: z.object({ id: z.string().uuid() }),
                body: z.object({ paymentMethod: z.string() }),
                response: {
                    200: z.object({ id: z.uuid() }),
                    404: httpErrorSchema,
                    500: httpErrorSchema,
                },
            },
            handler: async (request, reply) => {
                await this.paymentService.confirmPaymentIntent(request.params.id, request.body.paymentMethod);

                return reply.status(200).send({ id: request.params.id });
            },
        });
    }
}

export default HttpPaymentController;
export { HttpPaymentController };
