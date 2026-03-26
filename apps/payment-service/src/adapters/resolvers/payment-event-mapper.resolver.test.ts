import type { PaymentEventMapper } from '../../application';
import type { PaymentProviderEventDto } from '@workspace/payment';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentEventMapperResolverAdapter } from './payment-event-mapper.resolver';

describe('PaymentEventMapperResolverAdapter', () => {
    it('should resolve provider event mapper', () => {
        const stripeMapperMock: PaymentEventMapper['toPaymentProviderEvent'] = (paymentProviderEvent: PaymentProviderEventDto) => {
            return {
                paymentEvent: {
                    event: 'payment-initiated',
                    occurredAt: new Date(paymentProviderEvent.occurredAt),
                    idempotencyKey: paymentProviderEvent.idempotencyKey,
                    provider: paymentProviderEvent.provider,
                    providerEventId: paymentProviderEvent.providerEventId,
                    providerPaymentId: paymentProviderEvent.providerPaymentId,
                    providerRawPayload: paymentProviderEvent.providerRawPayload,
                },
                paymentData: {
                    status: 'initiated',
                },
            };
        };
        const resolver = new PaymentEventMapperResolverAdapter(new Map([['stripe', stripeMapperMock]]));

        const mapper = resolver.resolve('stripe');

        assert.strictEqual(mapper, stripeMapperMock);
    });

    it('should throw when provider event mapper is not found', () => {
        const resolver = new PaymentEventMapperResolverAdapter(new Map());

        assert.throws(() => resolver.resolve('stripe'), {
            name: 'ValidationError',
            message: 'Payment event mapper not found for provider: stripe',
        });
    });
});
