import type { FastifyRequest } from 'fastify';
import type { createHttpServer } from './server';
import type { PaymentService } from '../../application';
import type { Payment } from '../../domain';

class PaymentController {
    constructor(
        private readonly server: Awaited<ReturnType<typeof createHttpServer>>,
        private readonly paymentService: PaymentService,
    ) {}

    public async addRoutes() {
        this.server.route({
            method: 'POST',
            url: '/payments',
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        amount: { type: 'number' },
                        currency: { type: 'string' },
                        orderId: { type: 'string' },
                        method: { type: 'string' },
                    },
                },
                response: {
                    201: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                        },
                    },
                },
            },
            handler: async (request: FastifyRequest<{ Body: Payment }>, reply) => {
                const payment = await this.paymentService.createPayment(request.body);

                return reply.status(201).send({ id: payment.id });
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/:id',
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            amount: { type: 'number' },
                            currency: { type: 'string' },
                            orderId: { type: 'string' },
                            method: { type: 'string' },
                            status: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    204: {
                        type: 'null',
                    }
                },
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                    },
                },
            },
            handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentById(request.params.id);

                if (!payment) {
                    return reply.status(204).send();
                }

                return reply.status(200).send(payment);
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/intent/:intentId',
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                        },
                    },
                    204: {
                        type: 'null',
                    }
                },
                params: {
                    type: 'object',
                    properties: {
                        intentId: { type: 'string' },
                    },
                },
            },
            handler: async (request: FastifyRequest<{ Params: { intentId: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentByIntentId(request.params.intentId);

                if (!payment) {
                    return reply.status(204).send();
                }

                return reply.status(200).send(payment);
            },
        });
        
        this.server.route({
            method: 'GET',
            url: '/payments/order/:orderId',
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                        },
                    },
                    204: {
                        type: 'null',
                    }
                },
                params: {
                    type: 'object',
                    properties: {
                        orderId: { type: 'string' },
                    },
                },
            },
            handler: async (request: FastifyRequest<{ Params: { orderId: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentByOrderId(request.params.orderId);

                if (!payment) {
                    return reply.status(204).send();
                }

                return reply.status(200).send(payment);
            },
        });
    }
}

export default PaymentController;
export { PaymentController };
