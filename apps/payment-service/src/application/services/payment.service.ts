import type { PaymentRepository } from '..';
import type { Payment } from '../../domain';

class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async createPayment(payment: Payment): Promise<Payment> {
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
