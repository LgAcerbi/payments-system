import type { Payment } from '../../domain';

interface PaymentRepository {
    createPayment(payment: Payment): Promise<Payment>;
    getPaymentById(id: Payment['id']): Promise<Payment | null>;
    getPaymentByProviderPaymentId(
        providerPaymentId: Payment['providerPaymentId'],
        provider: Payment['provider'],
    ): Promise<Payment | null>;
    getPaymentByOrderId(orderId: Payment['orderId']): Promise<Payment | null>;
    confirmPaymentIntent(paymentId: Payment['id']): Promise<void>;
    updatePaymentStatusById(paymentId: Payment['id'], status: Payment['status']): Promise<void>;
    updatePaymentStatusByProviderPaymentId(
        providerPaymentId: Payment['providerPaymentId'],
        status: Payment['status'],
        provider: Payment['provider'],
    ): Promise<void>;
    findPaymentByIdempotencyKey(idempotencyKey: Payment['idempotencyKey']): Promise<Payment | null>;
}

export default PaymentRepository;
export type { PaymentRepository };
