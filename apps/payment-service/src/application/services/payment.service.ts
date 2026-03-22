import type { PaymentRepository } from '..';
import type { Payment } from '../../domain';

class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async createPayment(payment: Payment): Promise<Payment> {
        return this.paymentRepository.createPayment(payment);
    }

    async getPaymentById(id: string): Promise<Payment> {
        return this.paymentRepository.getPaymentById(id);
    }

    async getPaymentByIntentId(intentId: string): Promise<Payment> {
        return this.paymentRepository.getPaymentByIntentId(intentId);
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment> {
        return this.paymentRepository.getPaymentByOrderId(orderId);
    }
}

export default PaymentService;
export { PaymentService };
