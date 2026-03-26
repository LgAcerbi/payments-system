/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PaymentEventRepository, PaymentRepository } from '../';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Currency, Payment, PaymentEvent } from '../../domain';
import { PaymentEventService } from './payment-event.service';

const currentDate = new Date();

const createPayment = (status: Payment['status'] = 'processing'): Payment =>
    new Payment({
        id: 'payment-1',
        amount: 100,
        currency: new Currency('USD'),
        status,
        orderId: 'order-1',
        method: 'creditcard',
        provider: 'stripe',
        providerPaymentId: 'provider-payment-1',
        providerData: { id: 'provider-payment-1' },
        idempotencyKey: 'idem-payment-1',
        description: 'Test payment',
        amountRefunded: null,
        createdAt: currentDate,
        updatedAt: currentDate,
    });

const createPaymentEvent = (overrides: Partial<PaymentEvent> = {}): PaymentEvent =>
    new PaymentEvent({
        id: 'event-1',
        paymentId: 'payment-1',
        event: 'payment-processing',
        status: 'created',
        failureReason: null,
        idempotencyKey: 'idem-event-1',
        provider: 'stripe',
        providerEventId: 'provider-event-1',
        providerPaymentId: 'provider-payment-1',
        providerRawPayload: { raw: true },
        occurredAt: currentDate,
        createdAt: currentDate,
        ...overrides,
    });

const paymentRepositoryMock: PaymentRepository = {
    createPayment: async (payment: Payment) => createPayment(),
    getPaymentById: async (id: Payment['id']) => null,
    getPaymentByProviderPaymentId: async (
        providerPaymentId: Payment['providerPaymentId'],
        provider: Payment['provider'],
    ) => null,
    getPaymentByOrderId: async (orderId: Payment['orderId']) => null,
    confirmPaymentIntent: async (paymentId: Payment['id']) => undefined,
    updatePaymentStatusById: async (paymentId: Payment['id'], status: Payment['status']) => undefined,
    updatePaymentStatusByProviderPaymentId: async (
        providerPaymentId: Payment['providerPaymentId'],
        status: Payment['status'],
        provider: Payment['provider'],
    ) => undefined,
    findPaymentByIdempotencyKey: async (idempotencyKey: Payment['idempotencyKey']) => null,
};

const paymentEventRepositoryMock: PaymentEventRepository = {
    createPaymentEvent: async (paymentEvent: PaymentEvent) => paymentEvent,
    updatePaymentEventStatus: async (
        id: PaymentEvent['id'],
        status: PaymentEvent['status'],
        failureReason?: PaymentEvent['failureReason'],
    ) => undefined,
    updatePaymentEventPaymentId: async (id: PaymentEvent['id'], paymentId: PaymentEvent['paymentId']) => undefined,
    findPaymentEventByIdempotencyKey: async (idempotencyKey: PaymentEvent['idempotencyKey']) => null,
};

describe('PaymentEventService', () => {
    it('should process payment initiated event without payment lookup', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const updateStatusMock = mock.method(
            paymentEventRepositoryMock,
            'updatePaymentEventStatus',
            async () => undefined,
        );
        const getByProviderMock = mock.method(paymentRepositoryMock, 'getPaymentByProviderPaymentId', async () =>
            createPayment(),
        );

        await service.handlePaymentEvent(
            {
                event: 'payment-initiated',
                occurredAt: currentDate,
                idempotencyKey: 'idem-initiated',
                provider: 'stripe',
                providerEventId: 'provider-event-initiated',
                providerPaymentId: 'provider-payment-initiated',
                providerRawPayload: { initiated: true },
            },
            { status: 'initiated' },
        );

        assert.strictEqual(updateStatusMock.mock.callCount(), 1);
        assert.strictEqual(getByProviderMock.mock.callCount(), 0);

        updateStatusMock.mock.restore();
        getByProviderMock.mock.restore();
    });

    it('should throw conflict when idempotency key already exists', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const findByIdempotencyMock = mock.method(
            paymentEventRepositoryMock,
            'findPaymentEventByIdempotencyKey',
            async () => createPaymentEvent(),
        );

        await assert.rejects(
            service.handlePaymentEvent(
                {
                    event: 'payment-processing',
                    occurredAt: currentDate,
                    idempotencyKey: 'idem-duplicate',
                    provider: 'stripe',
                    providerEventId: 'provider-event-duplicate',
                    providerPaymentId: 'provider-payment-1',
                    providerRawPayload: {},
                },
                { status: 'processing' },
            ),
            {
                name: 'ConflictError',
                message: 'Payment event with idempotency key idem-duplicate already exists',
            },
        );

        findByIdempotencyMock.mock.restore();
    });

    it('should fail event and throw not found when payment does not exist', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const updateStatusMock = mock.method(
            paymentEventRepositoryMock,
            'updatePaymentEventStatus',
            async () => undefined,
        );

        await assert.rejects(
            service.handlePaymentEvent(
                {
                    event: 'payment-processing',
                    occurredAt: currentDate,
                    idempotencyKey: 'idem-not-found',
                    provider: 'stripe',
                    providerEventId: 'provider-event-not-found',
                    providerPaymentId: 'missing-provider-payment',
                    providerRawPayload: {},
                },
                { status: 'processing' },
            ),
            {
                name: 'NotFoundError',
                message: 'Payment with provider payment id missing-provider-payment not found',
            },
        );

        assert.strictEqual(updateStatusMock.mock.callCount(), 1);
        assert.strictEqual(updateStatusMock.mock.calls[0].arguments[1], 'failed');

        updateStatusMock.mock.restore();
    });

    it('should fail event and throw conflict when payment status transition is invalid', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const getByProviderMock = mock.method(paymentRepositoryMock, 'getPaymentByProviderPaymentId', async () =>
            createPayment('initiated'),
        );
        const updateStatusMock = mock.method(
            paymentEventRepositoryMock,
            'updatePaymentEventStatus',
            async () => undefined,
        );

        await assert.rejects(
            service.handlePaymentEvent(
                {
                    event: 'payment-succeeded',
                    occurredAt: currentDate,
                    idempotencyKey: 'idem-invalid-transition',
                    provider: 'stripe',
                    providerEventId: 'provider-event-invalid-transition',
                    providerPaymentId: 'provider-payment-1',
                    providerRawPayload: {},
                },
                { status: 'succeeded' },
            ),
            {
                name: 'ConflictError',
                message:
                    'Cannot set payment status to "succeeded" cause payment is not in the correct status to transition to it',
            },
        );

        assert.strictEqual(getByProviderMock.mock.callCount(), 1);
        assert.strictEqual(updateStatusMock.mock.callCount(), 1);
        assert.strictEqual(updateStatusMock.mock.calls[0].arguments[1], 'failed');

        getByProviderMock.mock.restore();
        updateStatusMock.mock.restore();
    });

    it('should process succeeded event when payment is already succeeded', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const getByProviderMock = mock.method(paymentRepositoryMock, 'getPaymentByProviderPaymentId', async () =>
            createPayment('succeeded'),
        );
        const updateStatusMock = mock.method(
            paymentEventRepositoryMock,
            'updatePaymentEventStatus',
            async () => undefined,
        );
        const updatePaymentStatusMock = mock.method(
            paymentRepositoryMock,
            'updatePaymentStatusByProviderPaymentId',
            async () => undefined,
        );

        await service.handlePaymentEvent(
            {
                event: 'payment-succeeded',
                occurredAt: currentDate,
                idempotencyKey: 'idem-already-succeeded',
                provider: 'stripe',
                providerEventId: 'provider-event-already-succeeded',
                providerPaymentId: 'provider-payment-1',
                providerRawPayload: {},
            },
            { status: 'succeeded' },
        );

        assert.strictEqual(getByProviderMock.mock.callCount(), 1);
        assert.strictEqual(updatePaymentStatusMock.mock.callCount(), 0);
        assert.strictEqual(updateStatusMock.mock.callCount(), 1);
        assert.strictEqual(updateStatusMock.mock.calls[0].arguments[1], 'processed');

        getByProviderMock.mock.restore();
        updateStatusMock.mock.restore();
        updatePaymentStatusMock.mock.restore();
    });

    it('should update payment status and process event when transition is valid', async () => {
        const service = new PaymentEventService(paymentRepositoryMock, paymentEventRepositoryMock);
        const getByProviderMock = mock.method(paymentRepositoryMock, 'getPaymentByProviderPaymentId', async () =>
            createPayment('processing'),
        );
        const updatePaymentStatusMock = mock.method(
            paymentRepositoryMock,
            'updatePaymentStatusByProviderPaymentId',
            async () => undefined,
        );
        const updateStatusMock = mock.method(
            paymentEventRepositoryMock,
            'updatePaymentEventStatus',
            async () => undefined,
        );

        await service.handlePaymentEvent(
            {
                event: 'payment-succeeded',
                occurredAt: currentDate,
                idempotencyKey: 'idem-success',
                provider: 'stripe',
                providerEventId: 'provider-event-success',
                providerPaymentId: 'provider-payment-1',
                providerRawPayload: {},
            },
            { status: 'succeeded' },
        );

        assert.strictEqual(getByProviderMock.mock.callCount(), 1);
        assert.strictEqual(updatePaymentStatusMock.mock.callCount(), 1);
        assert.deepStrictEqual(updatePaymentStatusMock.mock.calls[0].arguments, [
            'provider-payment-1',
            'succeeded',
            'stripe',
        ]);
        assert.strictEqual(updateStatusMock.mock.callCount(), 1);
        assert.strictEqual(updateStatusMock.mock.calls[0].arguments[1], 'processed');

        getByProviderMock.mock.restore();
        updatePaymentStatusMock.mock.restore();
        updateStatusMock.mock.restore();
    });
});
