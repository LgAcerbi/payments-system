import type { PaymentRepository, PaymentProviderGatewayResolver } from '..';

import { randomUUID } from 'crypto';
import { NotFoundError } from '@workspace/errors';
import { Payment } from '../../domain';

class PaymentService {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentProviderGatewayResolver: PaymentProviderGatewayResolver,
    ) {}

    async createPayment(
        paymentData: Pick<Payment, 'amount' | 'currency' | 'orderId' | 'method' | 'provider' | 'description'>,
        idempotencyKey: string,
    ): Promise<Payment> {
        const paymentProviderGateway = this.paymentProviderGatewayResolver.resolve(paymentData.provider);

        const providerPayment = await paymentProviderGateway.createPayment(
            paymentData.amount,
            paymentData.currency,
        );

        const payment = new Payment({
            id: randomUUID(),
            idempotencyKey: idempotencyKey,
            amount: paymentData.amount,
            description: paymentData.description,
            amountRefunded: null,
            currency: paymentData.currency,
            status: 'initiated',
            orderId: paymentData.orderId,
            method: paymentData.method,
            provider: paymentData.provider,
            providerPaymentId: providerPayment.id,
            providerData: {
                ...providerPayment,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return this.paymentRepository.createPayment(payment);
    }

    async confirmPaymentIntent(paymentId: string, paymentMethodId: string): Promise<void> {

        const payment = await this.paymentRepository.getPaymentById(paymentId);

        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        const paymentProviderGateway = this.paymentProviderGatewayResolver.resolve(payment.provider);
        
        await paymentProviderGateway.confirmPaymentIntent(payment.providerPaymentId, paymentMethodId);

        await this.paymentRepository.confirmPaymentIntent(paymentId);
    }

    async getPaymentById(id: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentById(id);

        if (!payment) {
            return null;
        }

        return payment;
    }

    async getPaymentByProviderPaymentId(
        providerPaymentId: string,
        provider: Payment['provider'],
    ): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentByProviderPaymentId(providerPaymentId, provider);

        if (!payment) {
            return null;
        }

        return payment;
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentByOrderId(orderId);

        if (!payment) {
            return null;
        }

        return payment;
    }
}

export default PaymentService;
export { PaymentService };
