import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency } from './currency';
import { Payment } from './payment';

describe('Payment', () => {
    it('should create a payment', () => {
        const createdAt = new Date();
        const updatedAt = new Date(createdAt.getTime() + 1000);

        const payment = new Payment({
            id: '123',
            amount: 100,
            currency: new Currency('USD'),
            status: 'initiated',
            orderId: '123',
            method: 'credit_card',
            provider: 'stripe',
            providerPaymentId: '123',
            providerData: {
                someRawData: 'some value',
            },
            idempotencyKey: '123',
            description: 'Test payment',
            amountRefunded: null,
            createdAt,
            updatedAt,
        });

        assert.strictEqual(payment.id, '123');
        assert.strictEqual(payment.amount, 100);
        assert.strictEqual(payment.currency.code, 'USD');
        assert.strictEqual(payment.status, 'initiated');
        assert.strictEqual(payment.orderId, '123');
        assert.strictEqual(payment.method, 'credit_card');
        assert.strictEqual(payment.provider, 'stripe');
        assert.strictEqual(payment.providerPaymentId, '123');
        assert.strictEqual(payment.idempotencyKey, '123');
        assert.strictEqual(payment.description, 'Test payment');
        assert.strictEqual(payment.amountRefunded, null);
        assert.strictEqual(payment.createdAt, createdAt);
        assert.strictEqual(payment.updatedAt, updatedAt);
        assert.deepStrictEqual(payment.providerData, { someRawData: 'some value' });
    });

    it('should throw an error if the ID is not provided', () => {
        assert.throws(
            () =>
                new Payment({
                    id: '',
                    amount: 1,
                    currency: new Currency('USD'),
                    status: 'initiated',
                    orderId: '123',
                    method: 'credit_card',
                    provider: 'stripe',
                    providerPaymentId: '123',
                    providerData: {
                        someRawData: 'some value',
                    },
                    idempotencyKey: '123',
                    description: 'Test payment',
                    amountRefunded: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'ID is required',
            },
        );
    });

    it('should throw an error if the amount is less than 0', () => {
        assert.throws(
            () =>
                new Payment({
                    id: '123',
                    amount: 0,
                    currency: new Currency('USD'),
                    status: 'initiated',
                    orderId: '123',
                    method: 'credit_card',
                    provider: 'stripe',
                    providerPaymentId: '123',
                    providerData: {
                        someRawData: 'some value',
                    },
                    idempotencyKey: '123',
                    description: 'Test payment',
                    amountRefunded: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'Amount must be greater than 0',
            },
        );
    });

    it('should throw an error if the orderId is not provided', () => {
        assert.throws(
            () =>
                new Payment({
                    id: '123',
                    amount: 100,
                    currency: new Currency('USD'),
                    status: 'initiated',
                    orderId: '',
                    method: 'credit_card',
                    provider: 'stripe',
                    providerPaymentId: '123',
                    providerData: {
                        someRawData: 'some value',
                    },
                    idempotencyKey: '123',
                    description: 'Test payment',
                    amountRefunded: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'Order ID is required',
            },
        );
    });

    it('should throw an error if the idempotency key is not provided', () => {
        assert.throws(
            () =>
                new Payment({
                    id: '123',
                    amount: 100,
                    currency: new Currency('USD'),
                    status: 'initiated',
                    orderId: '123',
                    method: 'credit_card',
                    provider: 'stripe',
                    providerPaymentId: '123',
                    providerData: {
                        someRawData: 'some value',
                    },
                    idempotencyKey: '',
                    description: 'Test payment',
                    amountRefunded: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            {
                name: 'ValidationError',
                message: 'Idempotency key is required',
            },
        );
    });

    it('should return true if the payment can transition to the given status and false otherwise', () => {
        const paymentData = {
            id: '123',
            amount: 100,
            currency: new Currency('USD'),
            orderId: '123',
            method: 'credit_card',
            providerPaymentId: '123',
            providerData: {
                someRawData: 'some value',
            },
            idempotencyKey: '123',
            description: 'Test payment',
            amountRefunded: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const initatedPayment = new Payment({
            ...paymentData,
            provider: 'stripe',
            status: 'initiated',
        });

        const processingPayment = new Payment({
            ...paymentData,
            provider: 'stripe',
            status: 'processing',
        });

        const succeededPayment = new Payment({
            ...paymentData,
            provider: 'stripe',
            status: 'succeeded',
        });

        const failedPayment = new Payment({
            ...paymentData,
            provider: 'stripe',
            status: 'failed',
        });

        const canceledPayment = new Payment({
            ...paymentData,
            provider: 'stripe',
            status: 'canceled',
        });

        // initiated
        assert.strictEqual(
            initatedPayment.canTransitionTo('initiated'),
            false,
            'Initiated payment cannot transition to initiated',
        );
        assert.strictEqual(
            initatedPayment.canTransitionTo('processing'),
            true,
            'Initiated payment can transition to processing',
        );
        assert.strictEqual(
            initatedPayment.canTransitionTo('succeeded'),
            false,
            'Initiated payment cannot transition to succeeded',
        );
        assert.strictEqual(
            initatedPayment.canTransitionTo('failed'),
            false,
            'Initiated payment cannot transition to failed',
        );
        assert.strictEqual(
            initatedPayment.canTransitionTo('canceled'),
            true,
            'Initiated payment cannot transition to canceled',
        );

        // processing
        assert.strictEqual(
            processingPayment.canTransitionTo('initiated'),
            false,
            'Processing payment cannot transition to initiated',
        );
        assert.strictEqual(
            processingPayment.canTransitionTo('processing'),
            false,
            'Processing payment cannot transition to processing',
        );
        assert.strictEqual(
            processingPayment.canTransitionTo('succeeded'),
            true,
            'Processing payment cannot transition to succeeded',
        );
        assert.strictEqual(
            processingPayment.canTransitionTo('failed'),
            true,
            'Processing payment cannot transition to failed',
        );
        assert.strictEqual(
            processingPayment.canTransitionTo('canceled'),
            false,
            'Processing payment cannot transition to canceled',
        );

        // succeeded
        assert.strictEqual(
            succeededPayment.canTransitionTo('initiated'),
            false,
            'Succeeded payment cannot transition to initiated',
        );
        assert.strictEqual(
            succeededPayment.canTransitionTo('processing'),
            false,
            'Succeeded payment cannot transition to processing',
        );
        assert.strictEqual(
            succeededPayment.canTransitionTo('succeeded'),
            false,
            'Succeeded payment cannot transition to succeeded',
        );
        assert.strictEqual(
            succeededPayment.canTransitionTo('failed'),
            false,
            'Succeeded payment cannot transition to failed',
        );
        assert.strictEqual(
            succeededPayment.canTransitionTo('canceled'),
            false,
            'Succeeded payment cannot transition to canceled',
        );

        // failed
        assert.strictEqual(
            failedPayment.canTransitionTo('initiated'),
            false,
            'Failed payment cannot transition to initiated',
        );
        assert.strictEqual(
            failedPayment.canTransitionTo('processing'),
            false,
            'Failed payment cannot transition to processing',
        );
        assert.strictEqual(
            failedPayment.canTransitionTo('succeeded'),
            false,
            'Failed payment cannot transition to succeeded',
        );
        assert.strictEqual(
            failedPayment.canTransitionTo('failed'),
            false,
            'Failed payment cannot transition to failed',
        );
        assert.strictEqual(
            failedPayment.canTransitionTo('canceled'),
            false,
            'Failed payment cannot transition to canceled',
        );

        // canceled
        assert.strictEqual(
            canceledPayment.canTransitionTo('initiated'),
            false,
            'Canceled payment cannot transition to initiated',
        );
        assert.strictEqual(
            canceledPayment.canTransitionTo('processing'),
            false,
            'Canceled payment cannot transition to processing',
        );
        assert.strictEqual(
            canceledPayment.canTransitionTo('succeeded'),
            false,
            'Canceled payment cannot transition to succeeded',
        );
        assert.strictEqual(
            canceledPayment.canTransitionTo('failed'),
            false,
            'Canceled payment cannot transition to failed',
        );
        assert.strictEqual(
            canceledPayment.canTransitionTo('canceled'),
            false,
            'Canceled payment cannot transition to canceled',
        );
    });
});
