import type { PaymentProviderEventDto } from '@workspace/payment';
import type { Payment, PaymentEvent } from '../../domain';
import type { PaymentEventMapper } from '../../application';

import { ValidationError } from '@workspace/errors';

const stripeEventMap = new Map<string, { event: PaymentEvent['event']; status: Payment['status'] }>([
    ['payment_intent.created', { event: 'payment-initiated', status: 'initiated' }],
    ['payment_intent.succeeded', { event: 'payment-succeeded', status: 'succeeded' }],
    ['payment_intent.processing', { event: 'payment-processing', status: 'processing' }],
    ['payment_intent.payment_failed', { event: 'payment-failed', status: 'failed' }],
    ['payment_intent.canceled', { event: 'payment-canceled', status: 'canceled' }],
]);

class StripePaymentEventMapper implements PaymentEventMapper {
    public toPaymentProviderEvent(paymentProviderEvent: PaymentProviderEventDto) {
        const stripeEvent = stripeEventMap.get(paymentProviderEvent.event);

        if (!stripeEvent) {
            throw new ValidationError(`Invalid stripe event: ${paymentProviderEvent.event}`);
        }

        const occurredAt = new Date(paymentProviderEvent.occurredAt);

        const partialPaymentEvent = {
            ...paymentProviderEvent,
            ...stripeEvent,
            occurredAt,
        };

        return { paymentEvent: partialPaymentEvent, paymentData: { status: stripeEvent.status } };
    }
}

export default StripePaymentEventMapper;
export { StripePaymentEventMapper };
