import type { PaymentRepository, PaymentGateway } from '..';

import { Payment } from '../../domain';

class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository, private readonly paymentGateway: PaymentGateway) {}

    async createPayment(paymentData: Omit<Payment, 'id' | 'intentId' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
        const paymentIntent = await this.paymentGateway.createPaymentIntent(paymentData.amount, paymentData.currency);

        const payment = new Payment(
            {
                id: paymentIntent.id,
                intentId: paymentIntent.id,
                status: 'INITIATED',
                amount: paymentData.amount,
                currency: paymentData.currency,
                orderId: paymentData.orderId,
                method: paymentData.method,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        );

        return this.paymentRepository.createPayment(payment);
    }

    async getPaymentById(id: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentById(id);

        if (!payment) {
            return null;
        }

        return payment;
    }

    async getPaymentByIntentId(intentId: string): Promise<Payment | null> {
        const payment = await this.paymentRepository.getPaymentByIntentId(intentId);

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
