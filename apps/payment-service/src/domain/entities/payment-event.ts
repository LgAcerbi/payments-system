import type { Payment } from './payment';

type PaymentEvents =
    | 'payment-initiated'
    | 'payment-succeeded'
    | 'payment-processing'
    | 'payment-failed'
    | 'payment-canceled';

type PaymentEventStatus = 'created' | 'processed' | 'failed';

class PaymentEvent {
    public readonly id: string;
    public readonly paymentId: Payment['id'] | null;
    public readonly event: PaymentEvents;
    public readonly status: PaymentEventStatus;
    public readonly failureReason: string | null;
    public readonly idempotencyKey: string;
    public readonly provider: Payment['provider'];
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
        failureReason,
        idempotencyKey,
        provider,
        providerEventId,
        providerPaymentId,
        providerRawPayload,
        occurredAt,
        createdAt,
    }: {
        id: string;
        paymentId: Payment['id'] | null;
        event: PaymentEvents;
        status: PaymentEventStatus;
        failureReason: string | null;
        idempotencyKey: string;
        provider: Payment['provider'];
        providerEventId: string;
        providerPaymentId: Payment['providerPaymentId'];
        providerRawPayload: unknown;
        occurredAt: Date;
        createdAt: Date;
    }) {
        this.id = id;
        this.paymentId = paymentId;
        this.event = event;
        this.status = status;
        this.failureReason = failureReason;
        this.idempotencyKey = idempotencyKey;
        this.provider = provider;
        this.providerEventId = providerEventId;
        this.providerPaymentId = providerPaymentId;
        this.providerRawPayload = providerRawPayload;
        this.occurredAt = occurredAt;
        this.createdAt = createdAt;
    }
}

export default PaymentEvent;
export { PaymentEvent };
