import type { PaymentProviderGateway } from '../../application';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentProviderGatewayResolverAdapter } from './payment-provider-gateway.resolver';

describe('PaymentProviderGatewayResolverAdapter', () => {
    it('should resolve provider gateway', () => {
        const stripeGatewayMock: PaymentProviderGateway = {
            createPayment: async () => ({ id: 'pi_1' }),
            confirmPaymentIntent: async () => undefined,
        };
        const resolver = new PaymentProviderGatewayResolverAdapter(new Map([['stripe', stripeGatewayMock]]));

        const gateway = resolver.resolve('stripe');

        assert.strictEqual(gateway, stripeGatewayMock);
    });

    it('should throw when provider gateway is not found', () => {
        const resolver = new PaymentProviderGatewayResolverAdapter(new Map());

        assert.throws(() => resolver.resolve('stripe'), {
            name: 'ValidationError',
            message: 'Payment provider gateway not found for provider: stripe',
        });
    });
});
