import type { Payment } from '../../domain';
import type { PaymentProviderEventDto } from '@workspace/payment';

import { ValidationError } from '@workspace/errors';

type PaymentProviderEvents =
    | 'payment-created'
    | 'payment-succeeded'
    | 'payment-processing'
    | 'payment-failed'
    | 'payment-canceled';

const stripeEventMap = new Map<
    string,
    { event: PaymentProviderEvents; status: Payment['status'] }
>([
    [
        'payment_intent.created',
        { event: 'payment-created', status: 'initiated' },
    ],
    [
        'payment_intent.succeeded',
        { event: 'payment-succeeded', status: 'succeeded' },
    ],
    [
        'payment_intent.processing',
        { event: 'payment-processing', status: 'processing' },
    ],
    [
        'payment_intent.payment_failed',
        { event: 'payment-failed', status: 'failed' },
    ],
    [
        'payment_intent.canceled',
        { event: 'payment-canceled', status: 'canceled' },
    ],
]);

type StripePaymentEvent = {
    provider: 'stripe';
    event: PaymentProviderEvents;
    status: Payment['status'];
    idempotencyKey: string;
    providerEventId: string;
    providerPaymentId: string;
    providerRawPayload: unknown;
    occurredAt: Date;
};

class StripePaymentEventMapper {
    public static toPaymentProviderEvent(
        paymentProviderEvent: PaymentProviderEventDto,
    ): StripePaymentEvent {
        const stripeEvent = stripeEventMap.get(paymentProviderEvent.event);

        if (!stripeEvent) {
            throw new ValidationError(
                `Invalid stripe event: ${paymentProviderEvent.event}`,
            );
        }

        const occurredAt = new Date(paymentProviderEvent.occurredAt);

        return {
            ...paymentProviderEvent,
            ...stripeEvent,
            occurredAt,
        };
    }
}

export default StripePaymentEventMapper;
export { StripePaymentEventMapper };
