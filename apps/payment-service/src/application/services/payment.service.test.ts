/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PaymentRepository, PaymentProviderGatewayResolver, PaymentProviderGateway } from '../';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { PaymentService } from './payment.service';
import { Currency, Payment } from '../../domain';

const currentDate = new Date();

const paymentRepositoryMock: PaymentRepository = {
    createPayment: async (payment: Payment) => {
        return new Payment({
            ...payment,
            id: '123',
            createdAt: currentDate,
            updatedAt: currentDate,
        });
    },
    getPaymentById: async (id: Payment['id']) => {
        return null;
    },
    getPaymentByProviderPaymentId: async (
        providerPaymentId: Payment['providerPaymentId'],
        provider: Payment['provider'],
    ) => {
        return null;
    },
    getPaymentByOrderId: async (orderId: Payment['orderId']) => {
        return null;
    },
    confirmPaymentIntent: async (paymentId: Payment['id']) => {
        return;
    },
    updatePaymentStatusById: async (paymentId: Payment['id'], status: Payment['status']) => {
        return;
    },
    updatePaymentStatusByProviderPaymentId: async (
        providerPaymentId: Payment['providerPaymentId'],
        status: Payment['status'],
        provider: Payment['provider'],
    ) => {
        return;
    },
    findPaymentByIdempotencyKey: async (idempotencyKey: Payment['idempotencyKey']) => {
        return null;
    },
};

const paymentProviderGatewayMock: PaymentProviderGateway = {
    createPayment: async (amount: number, currency: string) => {
        return { id: '123' };
    },
    confirmPaymentIntent: async (paymentId: string, paymentMethodId: string) => {
        return;
    },
};

const paymentProviderGatewayResolverMock: PaymentProviderGatewayResolver = {
    resolve: (provider: Payment['provider']) => {
        return paymentProviderGatewayMock;
    },
};

describe('PaymentService', () => {
    it('should create a payment', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);

        const payment = await paymentService.createPayment(
            {
                amount: 100,
                currency: 'USD',
                orderId: '123',
                method: 'credit_card',
                provider: 'stripe',
                description: 'Test payment',
            },
            '123',
        );

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
        assert.strictEqual(payment.createdAt, currentDate);
        assert.strictEqual(payment.updatedAt, currentDate);
        assert.deepStrictEqual(payment.providerData, { id: '123' });
    });

    it('should throw an error if the payment with the same idempotency key already exists', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);

        const findPaymentByIdempotencyKeyMock = mock.method(
            paymentRepositoryMock,
            'findPaymentByIdempotencyKey',
            async () => {
                return new Payment({
                    id: '123',
                    amount: 100,
                    currency: new Currency('USD'),
                    status: 'initiated',
                    orderId: '123',
                    method: 'credit_card',
                    provider: 'stripe',
                    providerPaymentId: '123',
                    providerData: {
                        id: '123',
                    },
                    idempotencyKey: '123',
                    description: 'Test payment',
                    amountRefunded: null,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                });
            },
        );

        await assert.rejects(
            paymentService.createPayment(
                {
                    amount: 100,
                    currency: 'USD',
                    orderId: '123',
                    method: 'credit_card',
                    provider: 'stripe',
                    description: 'Test payment',
                },
                '123',
            ),
            {
                name: 'ConflictError',
                message: 'Payment with idempotency key 123 already exists',
            },
        );

        findPaymentByIdempotencyKeyMock.mock.restore();
    });

    it('should get a payment by id', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);
        const getPaymentByIdMock = mock.method(paymentRepositoryMock, 'getPaymentById', async () => {
            return new Payment({
                id: '123',
                amount: 100,
                currency: new Currency('USD'),
                status: 'initiated',
                orderId: '123',
                method: 'credit_card',
                provider: 'stripe',
                providerPaymentId: '123',
                providerData: { id: '123' },
                idempotencyKey: '123',
                description: 'Test payment',
                amountRefunded: null,
                createdAt: currentDate,
                updatedAt: currentDate,
            });
        });

        const payment = await paymentService.getPaymentById('123');
        assert.strictEqual(payment.id, '123');

        getPaymentByIdMock.mock.restore();
    });

    it('should throw not found when payment id does not exist', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);

        await assert.rejects(paymentService.getPaymentById('missing'), {
            name: 'NotFoundError',
            message: 'Payment not found',
        });
    });

    it('should get a payment by provider payment id', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);
        const getByProviderMock = mock.method(paymentRepositoryMock, 'getPaymentByProviderPaymentId', async () => {
            return new Payment({
                id: '123',
                amount: 100,
                currency: new Currency('USD'),
                status: 'initiated',
                orderId: '123',
                method: 'credit_card',
                provider: 'stripe',
                providerPaymentId: 'provider-123',
                providerData: { id: 'provider-123' },
                idempotencyKey: '123',
                description: 'Test payment',
                amountRefunded: null,
                createdAt: currentDate,
                updatedAt: currentDate,
            });
        });

        const payment = await paymentService.getPaymentByProviderPaymentId('provider-123', 'stripe');
        assert.strictEqual(payment.providerPaymentId, 'provider-123');

        getByProviderMock.mock.restore();
    });

    it('should throw not found when provider payment id does not exist', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);

        await assert.rejects(paymentService.getPaymentByProviderPaymentId('missing', 'stripe'), {
            name: 'NotFoundError',
            message: 'Payment not found',
        });
    });

    it('should get a payment by order id', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);
        const getByOrderIdMock = mock.method(paymentRepositoryMock, 'getPaymentByOrderId', async () => {
            return new Payment({
                id: '123',
                amount: 100,
                currency: new Currency('USD'),
                status: 'initiated',
                orderId: 'order-123',
                method: 'credit_card',
                provider: 'stripe',
                providerPaymentId: '123',
                providerData: { id: '123' },
                idempotencyKey: '123',
                description: 'Test payment',
                amountRefunded: null,
                createdAt: currentDate,
                updatedAt: currentDate,
            });
        });

        const payment = await paymentService.getPaymentByOrderId('order-123');
        assert.strictEqual(payment.orderId, 'order-123');

        getByOrderIdMock.mock.restore();
    });

    it('should throw not found when order id does not exist', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);

        await assert.rejects(paymentService.getPaymentByOrderId('missing'), {
            name: 'NotFoundError',
            message: 'Payment not found',
        });
    });

    it('should confirm payment intent', async () => {
        const paymentService = new PaymentService(paymentRepositoryMock, paymentProviderGatewayResolverMock);
        const getPaymentByIdMock = mock.method(paymentRepositoryMock, 'getPaymentById', async () => {
            return new Payment({
                id: '123',
                amount: 100,
                currency: new Currency('USD'),
                status: 'initiated',
                orderId: '123',
                method: 'credit_card',
                provider: 'stripe',
                providerPaymentId: 'provider-123',
                providerData: { id: 'provider-123' },
                idempotencyKey: '123',
                description: 'Test payment',
                amountRefunded: null,
                createdAt: currentDate,
                updatedAt: currentDate,
            });
        });
        const confirmProviderMock = mock.method(paymentProviderGatewayMock, 'confirmPaymentIntent', async () => {
            return;
        });
        const confirmRepositoryMock = mock.method(paymentRepositoryMock, 'confirmPaymentIntent', async () => {
            return;
        });

        await paymentService.confirmPaymentIntent('123', 'pm_123');

        assert.strictEqual(confirmProviderMock.mock.callCount(), 1);
        assert.deepStrictEqual(confirmProviderMock.mock.calls[0].arguments, ['provider-123', 'pm_123']);
        assert.strictEqual(confirmRepositoryMock.mock.callCount(), 1);
        assert.deepStrictEqual(confirmRepositoryMock.mock.calls[0].arguments, ['123']);

        getPaymentByIdMock.mock.restore();
        confirmProviderMock.mock.restore();
        confirmRepositoryMock.mock.restore();
    });
});
