import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { StripePaymentProviderGateway } from './payment-provider.gateway';

describe('StripePaymentProviderGateway', () => {
    it('should create payment intent and return provider id', async () => {
        const gateway = new StripePaymentProviderGateway('sk_test_key');
        const createMock = mock.method(
            (gateway as unknown as {
                stripeInstance: {
                    paymentIntents: {
                        create: (data: { amount: number; currency: string }) => Promise<{ id: string }>;
                    };
                };
            }).stripeInstance.paymentIntents,
            'create',
            async (data: { amount: number; currency: string }) => {
                return { id: 'pi_123', ...data };
            },
        );

        const result = await gateway.createPayment(1000, 'USD');

        assert.deepStrictEqual(result, { id: 'pi_123' });
        assert.strictEqual(createMock.mock.callCount(), 1);
        assert.deepStrictEqual(createMock.mock.calls[0].arguments[0], { amount: 1000, currency: 'usd' });

        createMock.mock.restore();
    });

    it('should confirm payment intent with payment method', async () => {
        const gateway = new StripePaymentProviderGateway('sk_test_key');
        const confirmMock = mock.method(
            (gateway as unknown as {
                stripeInstance: {
                    paymentIntents: {
                        confirm: (paymentId: string, data: { payment_method: string }) => Promise<unknown>;
                    };
                };
            }).stripeInstance.paymentIntents,
            'confirm',
            async () => ({}),
        );

        await gateway.confirmPaymentIntent('pi_123', 'pm_123');

        assert.strictEqual(confirmMock.mock.callCount(), 1);
        assert.deepStrictEqual(confirmMock.mock.calls[0].arguments, ['pi_123', { payment_method: 'pm_123' }]);

        confirmMock.mock.restore();
    });
});
