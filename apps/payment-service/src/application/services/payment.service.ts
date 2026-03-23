import type { PaymentRepository, PaymentProviderGateway } from '..';

import { randomUUID } from 'crypto';
import { Payment } from '../../domain';

class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository, private readonly paymentProviderGateway: PaymentProviderGateway) {}

    async createPayment(paymentData: Pick<Payment, 'amount' | 'currency' | 'orderId' | 'method' | 'provider' | 'description'>, idempotencyKey: string): Promise<Payment> {
        const providerPayment = await this.paymentProviderGateway.createPayment(paymentData.amount, paymentData.currency);

        const payment = new Payment(
            {
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
            }
        );

        return this.paymentRepository.createPayment(payment);
    }

    async confirmPaymentIntent(paymentId: string, paymentMethodId: string): Promise<void> {
        await this.paymentProviderGateway.confirmPaymentIntent(paymentId, paymentMethodId);

        await this.paymentRepository.confirmPaymentIntent(paymentId);
    }

    async getPaymentById(id: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentById(id);

        if (!payment) {
            return null;
        }

        return payment;
    }

    async getPaymentByProviderId(providerId: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentByProviderId(providerId);

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
