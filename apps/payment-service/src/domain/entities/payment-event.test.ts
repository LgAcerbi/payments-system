import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentEvent } from '../';

describe('PaymentEvent', () => {
    it('should create a payment event', () => {
        const createdAt = new Date();
        const occurredAt = new Date();

        const paymentEvent = new PaymentEvent({
            id: '123',
            paymentId: '123',
            event: 'payment-initiated',
            status: 'created',
            failureReason: null,
            idempotencyKey: '123',
            provider: 'stripe',
            providerEventId: '123',
            providerPaymentId: '123',
            providerRawPayload: {
                someRawData: 'some value',
            },
            occurredAt,
            createdAt,
        });

        assert.strictEqual(paymentEvent.id, '123');
        assert.strictEqual(paymentEvent.paymentId, '123');
        assert.strictEqual(paymentEvent.event, 'payment-initiated');
        assert.strictEqual(paymentEvent.status, 'created');
        assert.strictEqual(paymentEvent.failureReason, null);
        assert.strictEqual(paymentEvent.idempotencyKey, '123');
        assert.strictEqual(paymentEvent.provider, 'stripe');
        assert.strictEqual(paymentEvent.providerEventId, '123');
        assert.strictEqual(paymentEvent.providerPaymentId, '123');
        assert.strictEqual(paymentEvent.occurredAt, occurredAt);
        assert.strictEqual(paymentEvent.createdAt, createdAt);
        assert.deepStrictEqual(paymentEvent.providerRawPayload, { someRawData: 'some value' });
    });

    it('should throw an error if the ID is not provided', () => {
        assert.throws(
            () =>
                new PaymentEvent({
                    id: '',
                    paymentId: '123',
                    event: 'payment-initiated',
                    status: 'created',
                    failureReason: null,
                    idempotencyKey: '123',
                    provider: 'stripe',
                    providerEventId: '123',
                    providerPaymentId: '123',
                    providerRawPayload: {
                        someRawData: 'some value',
                    },
                    occurredAt: new Date(),
                    createdAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'ID is required',
            },
        );
    });

    it('should throw an error if the Payment ID is not provided', () => {
        assert.throws(
            () =>
                new PaymentEvent({
                    id: '123',
                    paymentId: '',
                    event: 'payment-initiated',
                    status: 'created',
                    failureReason: null,
                    idempotencyKey: '123',
                    provider: 'stripe',
                    providerEventId: '123',
                    providerPaymentId: '123',
                    providerRawPayload: {
                        someRawData: 'some value',
                    },
                    occurredAt: new Date(),
                    createdAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'Payment ID is required',
            },
        );
    });

    it('should throw an error if the Idempotency key is not provided', () => {
        assert.throws(
            () =>
                new PaymentEvent({
                    id: '123',
                    paymentId: '123',
                    event: 'payment-initiated',
                    status: 'created',
                    failureReason: null,
                    idempotencyKey: '',
                    provider: 'stripe',
                    providerEventId: '123',
                    providerPaymentId: '123',
                    providerRawPayload: {
                        someRawData: 'some value',
                    },
                    occurredAt: new Date(),
                    createdAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'Idempotency key is required',
            },
        );
    });

    it('should return true if the payment event can transition to the given status and false otherwise', () => {
        const paymentEventData = {
            id: '123',
            paymentId: '123',
            event: 'payment-initiated',
            status: 'created',
            failureReason: null,
            idempotencyKey: '123',
            provider: 'stripe',
            providerEventId: '123',
            providerPaymentId: '123',
            providerRawPayload: {
                someRawData: 'some value',
            },
            occurredAt: new Date(),
            createdAt: new Date(),
        };

        const createdPaymentEvent = new PaymentEvent({
            ...paymentEventData,
            status: 'created',
            event: 'payment-initiated',
            provider: 'stripe',
        });

        const processedPaymentEvent = new PaymentEvent({
            ...paymentEventData,
            status: 'processed',
            event: 'payment-succeeded',
            provider: 'stripe',
        });

        const failedPaymentEvent = new PaymentEvent({
            ...paymentEventData,
            status: 'failed',
            event: 'payment-failed',
            provider: 'stripe',
        });

        // created
        assert.strictEqual(createdPaymentEvent.canTransitionTo('created'), false, 'Created payment event cannot transition to created');
        assert.strictEqual(createdPaymentEvent.canTransitionTo('processed'), true, 'Created payment event can transition to processed');
        assert.strictEqual(createdPaymentEvent.canTransitionTo('failed'), true, 'Created payment event can transition to failed');

        // processed
        assert.strictEqual(processedPaymentEvent.canTransitionTo('created'), false, 'Processed payment event cannot transition to created');
        assert.strictEqual(processedPaymentEvent.canTransitionTo('processed'), false, 'Processed payment event cannot transition to processed');
        assert.strictEqual(processedPaymentEvent.canTransitionTo('failed'), false, 'Processed payment event cannot transition to failed');

        // failed
        assert.strictEqual(failedPaymentEvent.canTransitionTo('created'), false, 'Failed payment event cannot transition to created');
        assert.strictEqual(failedPaymentEvent.canTransitionTo('processed'), false, 'Failed payment event cannot transition to processed');
        assert.strictEqual(failedPaymentEvent.canTransitionTo('failed'), false, 'Failed payment event cannot transition to failed');
    });
});
