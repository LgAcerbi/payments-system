import type { PaymentProviderEventDto } from '@workspace/payment';
import type { Payment, PaymentEvent } from '../../domain';
import type { PaymentEventMapper } from '../../application';

import { ValidationError } from '@workspace/errors';

const stripeEventMap = new Map<string, { event: PaymentEvent['event']; paymentStatus: Payment['status'] }>([
    ['payment_intent.created', { event: 'payment-initiated', paymentStatus: 'initiated' }],
    ['payment_intent.succeeded', { event: 'payment-succeeded', paymentStatus: 'succeeded' }],
    ['payment_intent.processing', { event: 'payment-processing', paymentStatus: 'processing' }],
    ['payment_intent.payment_failed', { event: 'payment-failed', paymentStatus: 'failed' }],
    ['payment_intent.canceled', { event: 'payment-canceled', paymentStatus: 'canceled' }],
]);

class StripePaymentEventMapper implements PaymentEventMapper {
    public toPaymentProviderEvent(paymentProviderEvent: PaymentProviderEventDto) {
        const stripeEvent = stripeEventMap.get(paymentProviderEvent.event);

        if (!stripeEvent) {
            throw new ValidationError(`Invalid stripe event: ${paymentProviderEvent.event}`);
        }

        const occurredAt = new Date(paymentProviderEvent.occurredAt);

        const partialPaymentEvent = {
            event: stripeEvent.event,
            occurredAt,
        };

        return { paymentEvent: partialPaymentEvent, paymentData: { status: stripeEvent.paymentStatus } };
    }
}

export default StripePaymentEventMapper;
export { StripePaymentEventMapper };
