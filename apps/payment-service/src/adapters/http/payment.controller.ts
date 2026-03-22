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
            handler: async (request: FastifyRequest<{ Body: Payment }>, reply) => {
                const payment = await this.paymentService.createPayment(request.body);

                return reply.status(201).send(payment);
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/:id',
            handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentById(request.params.id);

                return reply.status(200).send(payment);
            },
        });

        this.server.route({
            method: 'GET',
            url: '/payments/intent/:intentId',
            handler: async (request: FastifyRequest<{ Params: { intentId: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentByIntentId(request.params.intentId);

                return reply.status(200).send(payment);
            },
        });
        
        this.server.route({
            method: 'GET',
            url: '/payments/order/:orderId',
            handler: async (request: FastifyRequest<{ Params: { orderId: string } }>, reply) => {
                const payment = await this.paymentService.getPaymentByOrderId(request.params.orderId);
                
                return reply.status(200).send(payment);
            },
        });
    }
}

export default PaymentController;
export { PaymentController };
