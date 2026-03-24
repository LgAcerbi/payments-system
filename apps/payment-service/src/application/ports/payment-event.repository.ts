import type { PaymentEvent } from "../../domain/entities/payment-event";

interface PaymentEventRepository {
    createPaymentEvent(paymentEvent: PaymentEvent): Promise<PaymentEvent>;
    findPaymentEventByIdempotencyKey(idempotencyKey: PaymentEvent['idempotencyKey']): Promise<PaymentEvent>;
}

export default PaymentEventRepository;
export type { PaymentEventRepository };