import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PaymentEvent } from "../";

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
        assert.throws(() => new PaymentEvent({
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
        }), {
            name: 'ValidationError',
            message: 'ID is required',
        });
    });

    it('should throw an error if the Payment ID is not provided', () => {
        assert.throws(() => new PaymentEvent({
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
        }), {
            name: 'ValidationError',
            message: 'Payment ID is required',
        });
    });

    it('should throw an error if the Idempotency key is not provided', () => {
        assert.throws(() => new PaymentEvent({
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
        }), {
            name: 'ValidationError',
            message: 'Idempotency key is required',
        });
    });
});