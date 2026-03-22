import type { Payment } from "../../domain";

interface PaymentRepository {
    createPayment(payment: Payment): Promise<Payment>;
    getPaymentById(id: string): Promise<Payment>;
    getPaymentByProviderId(providerId: string): Promise<Payment>;
    getPaymentByOrderId(orderId: string): Promise<Payment>;
    confirmPaymentIntent(paymentId: string): Promise<void>;
}

export default PaymentRepository;
export type { PaymentRepository };