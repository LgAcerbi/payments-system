import type { Payment } from "../../domain";

interface PaymentRepository {
    createPayment(payment: Payment): Promise<Payment>;
    getPaymentById(id: Payment['id']): Promise<Payment>;
    getPaymentByProviderPaymentId(providerPaymentId: Payment['providerPaymentId'], provider: Payment['provider']): Promise<Payment>;
    getPaymentByOrderId(orderId: Payment['orderId']): Promise<Payment>;
    confirmPaymentIntent(paymentId: Payment['id']): Promise<void>;
    updatePaymentStatusById(paymentId: Payment['id'], status: Payment['status']): Promise<void>;
    updatePaymentStatusByProviderPaymentId(providerPaymentId: Payment['providerPaymentId'], status: Payment['status'], provider: Payment['provider']): Promise<void>;
}

export default PaymentRepository;
export type { PaymentRepository };