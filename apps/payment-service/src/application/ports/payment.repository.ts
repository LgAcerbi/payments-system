import type { Payment } from "../../domain";

interface PaymentRepository {
    createPayment(payment: Payment): Promise<Payment>;
    getPaymentById(id: string): Promise<Payment>;
    getPaymentByIntentId(intentId: string): Promise<Payment>;
    getPaymentByOrderId(orderId: string): Promise<Payment>;
}

export default PaymentRepository;
export type { PaymentRepository };