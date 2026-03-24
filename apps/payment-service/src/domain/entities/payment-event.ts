import type { Payment } from './payment';

type PaymentEvents =
    | 'payment-initiated'
    | 'payment-succeeded'
    | 'payment-processing'
    | 'payment-failed'
    | 'payment-canceled';

class PaymentEvent {
    public readonly id: string;
    public readonly paymentId: Payment['id'];
    public readonly event: PaymentEvents;
    public readonly status: Payment['status'];
    public readonly idempotencyKey: string;
    public readonly providerEventId: string;
    public readonly providerPaymentId: Payment['providerPaymentId'];
    public readonly providerRawPayload: unknown;
    public readonly occurredAt: Date;
    public readonly createdAt: Date;

    constructor({
        id,
        paymentId,
        event,
        status,
        idempotencyKey,
        providerEventId,
        providerPaymentId,
        providerRawPayload,
        occurredAt,
        createdAt,
    }: {
        id: string;
        paymentId: string;
        event: PaymentEvents;
        status: Payment['status'];
        idempotencyKey: string;
        providerEventId: string;
        providerPaymentId: string;
        providerRawPayload: unknown;
        occurredAt: Date;
        createdAt: Date;
    }) {
        this.id = id;
        this.paymentId = paymentId;
        this.event = event;
        this.status = status;
        this.idempotencyKey = idempotencyKey;
        this.providerEventId = providerEventId;
        this.providerPaymentId = providerPaymentId;
        this.providerRawPayload = providerRawPayload;
        this.occurredAt = occurredAt;
        this.createdAt = createdAt;
    }
}

export default PaymentEvent;
export { PaymentEvent };
