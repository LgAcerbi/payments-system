import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { StripePaymentEventMapper } from './payment-event.mapper';

describe('StripePaymentEventMapper', () => {
    it('should map stripe succeeded event to payment provider event', () => {
        const mapper = new StripePaymentEventMapper();
        const result = mapper.toPaymentProviderEvent({
            provider: 'stripe',
            event: 'payment_intent.succeeded',
            idempotencyKey: 'idem-1',
            providerEventId: 'evt_1',
            providerPaymentId: 'pi_1',
            providerRawPayload: { id: 'evt_1' },
            occurredAt: '2026-03-26T00:00:00.000Z',
        });

        assert.strictEqual(result.paymentEvent.event, 'payment-succeeded');
        assert.strictEqual(result.paymentData.status, 'succeeded');
        assert.strictEqual(result.paymentEvent.provider, 'stripe');
        assert.strictEqual(result.paymentEvent.idempotencyKey, 'idem-1');
        assert.strictEqual(result.paymentEvent.providerEventId, 'evt_1');
        assert.strictEqual(result.paymentEvent.providerPaymentId, 'pi_1');
        assert.ok(result.paymentEvent.occurredAt instanceof Date);
    });

    it('should throw when stripe event is invalid', () => {
        const mapper = new StripePaymentEventMapper();

        assert.throws(
            () =>
                mapper.toPaymentProviderEvent({
                    provider: 'stripe',
                    event: 'payment_intent.unknown',
                    idempotencyKey: 'idem-1',
                    providerEventId: 'evt_1',
                    providerPaymentId: 'pi_1',
                    providerRawPayload: { id: 'evt_1' },
                    occurredAt: '2026-03-26T00:00:00.000Z',
                }),
            {
                name: 'ValidationError',
                message: 'Invalid stripe event: payment_intent.unknown',
            },
        );
    });
});
