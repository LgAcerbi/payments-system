import type { Consumer, Producer } from 'kafkajs';
import type { PaymentEventMapperResolver, PaymentEventService } from '../../application';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '@workspace/errors';
import { KafkaPaymentProviderEventConsumer } from './payment-provider-event.consumer';

const createValidEventMessage = (idempotencyKey = 'idem-1') =>
    JSON.stringify({
        provider: 'stripe',
        event: 'payment_intent.processing',
        idempotencyKey,
        providerEventId: 'evt_1',
        providerPaymentId: 'pi_1',
        providerRawPayload: { any: 'data' },
        occurredAt: '2026-03-26T00:00:00.000Z',
    });

describe('KafkaPaymentProviderEventConsumer', () => {
    it('should process a valid provider event message', async () => {
        let eachMessageHandler: ((payload: any) => Promise<void>) | null = null;
        const kafkaConsumerMock = {
            run: async ({ eachMessage }: { eachMessage: (payload: any) => Promise<void> }) => {
                eachMessageHandler = eachMessage;
            },
        } as unknown as Consumer;

        let handled = false;
        const paymentEventServiceMock = {
            handlePaymentEvent: async () => {
                handled = true;
            },
        } as unknown as PaymentEventService;

        const paymentEventMapperResolverMock = {
            resolve: () => {
                return () => ({
                    paymentEvent: {
                        event: 'payment-processing',
                        occurredAt: new Date('2026-03-26T00:00:00.000Z'),
                        idempotencyKey: 'idem-1',
                        provider: 'stripe',
                        providerEventId: 'evt_1',
                        providerPaymentId: 'pi_1',
                        providerRawPayload: { any: 'data' },
                    },
                    paymentData: { status: 'processing' },
                });
            },
        } as unknown as PaymentEventMapperResolver;

        const consumer = new KafkaPaymentProviderEventConsumer({
            kafkaConsumer: kafkaConsumerMock,
            paymentEventService: paymentEventServiceMock,
            paymentEventMapperResolver: paymentEventMapperResolverMock,
            retryAttempts: 1,
            retryBaseDelayMs: 0,
        });

        await consumer.startConsume();
        await eachMessageHandler?.({
            topic: 'payment-events',
            partition: 0,
            message: { offset: '1', key: Buffer.from('k'), value: Buffer.from(createValidEventMessage()) },
        });

        assert.strictEqual(handled, true);
    });

    it('should not process empty message value', async () => {
        let eachMessageHandler: ((payload: any) => Promise<void>) | null = null;
        const kafkaConsumerMock = {
            run: async ({ eachMessage }: { eachMessage: (payload: any) => Promise<void> }) => {
                eachMessageHandler = eachMessage;
            },
        } as unknown as Consumer;

        let handled = false;
        const paymentEventServiceMock = {
            handlePaymentEvent: async () => {
                handled = true;
            },
        } as unknown as PaymentEventService;

        const paymentEventMapperResolverMock = {
            resolve: () => {
                return () => ({
                    paymentEvent: {
                        event: 'payment-processing',
                        occurredAt: new Date(),
                        idempotencyKey: 'idem-1',
                        provider: 'stripe',
                        providerEventId: 'evt_1',
                        providerPaymentId: 'pi_1',
                        providerRawPayload: {},
                    },
                    paymentData: { status: 'processing' },
                });
            },
        } as unknown as PaymentEventMapperResolver;

        const consumer = new KafkaPaymentProviderEventConsumer({
            kafkaConsumer: kafkaConsumerMock,
            paymentEventService: paymentEventServiceMock,
            paymentEventMapperResolver: paymentEventMapperResolverMock,
            retryAttempts: 1,
            retryBaseDelayMs: 0,
        });

        await consumer.startConsume();
        await eachMessageHandler?.({
            topic: 'payment-events',
            partition: 0,
            message: { offset: '1', key: null, value: null },
        });

        assert.strictEqual(handled, false);
    });

    it('should send message to dead letter after retries for unexpected errors', async () => {
        let eachMessageHandler: ((payload: any) => Promise<void>) | null = null;
        const kafkaConsumerMock = {
            run: async ({ eachMessage }: { eachMessage: (payload: any) => Promise<void> }) => {
                eachMessageHandler = eachMessage;
            },
        } as unknown as Consumer;

        let attempts = 0;
        const paymentEventServiceMock = {
            handlePaymentEvent: async () => {
                attempts += 1;
                throw new Error('unexpected');
            },
        } as unknown as PaymentEventService;

        const paymentEventMapperResolverMock = {
            resolve: () => {
                return () => ({
                    paymentEvent: {
                        event: 'payment-processing',
                        occurredAt: new Date('2026-03-26T00:00:00.000Z'),
                        idempotencyKey: 'idem-1',
                        provider: 'stripe',
                        providerEventId: 'evt_1',
                        providerPaymentId: 'pi_1',
                        providerRawPayload: { any: 'data' },
                    },
                    paymentData: { status: 'processing' },
                });
            },
        } as unknown as PaymentEventMapperResolver;

        let deadLetterCalls = 0;
        const producerMock = {
            send: async () => {
                deadLetterCalls += 1;
                return [{}];
            },
        } as unknown as Producer;

        const consumer = new KafkaPaymentProviderEventConsumer({
            kafkaConsumer: kafkaConsumerMock,
            paymentEventService: paymentEventServiceMock,
            paymentEventMapperResolver: paymentEventMapperResolverMock,
            retryAttempts: 2,
            retryBaseDelayMs: 0,
            deadLetterConfig: {
                producer: producerMock,
                topic: 'payment-events-dlq',
            },
        });

        await consumer.startConsume();
        await eachMessageHandler?.({
            topic: 'payment-events',
            partition: 0,
            message: { offset: '1', key: Buffer.from('k'), value: Buffer.from(createValidEventMessage()) },
        });

        assert.strictEqual(attempts, 2);
        assert.strictEqual(deadLetterCalls, 1);
    });

    it('should not retry when service throws validation error', async () => {
        let eachMessageHandler: ((payload: any) => Promise<void>) | null = null;
        const kafkaConsumerMock = {
            run: async ({ eachMessage }: { eachMessage: (payload: any) => Promise<void> }) => {
                eachMessageHandler = eachMessage;
            },
        } as unknown as Consumer;

        let attempts = 0;
        const paymentEventServiceMock = {
            handlePaymentEvent: async () => {
                attempts += 1;
                throw new ValidationError('invalid');
            },
        } as unknown as PaymentEventService;

        const paymentEventMapperResolverMock = {
            resolve: () => {
                return () => ({
                    paymentEvent: {
                        event: 'payment-processing',
                        occurredAt: new Date('2026-03-26T00:00:00.000Z'),
                        idempotencyKey: 'idem-1',
                        provider: 'stripe',
                        providerEventId: 'evt_1',
                        providerPaymentId: 'pi_1',
                        providerRawPayload: { any: 'data' },
                    },
                    paymentData: { status: 'processing' },
                });
            },
        } as unknown as PaymentEventMapperResolver;

        const consumer = new KafkaPaymentProviderEventConsumer({
            kafkaConsumer: kafkaConsumerMock,
            paymentEventService: paymentEventServiceMock,
            paymentEventMapperResolver: paymentEventMapperResolverMock,
            retryAttempts: 3,
            retryBaseDelayMs: 0,
        });

        await consumer.startConsume();
        await eachMessageHandler?.({
            topic: 'payment-events',
            partition: 0,
            message: { offset: '1', key: Buffer.from('k'), value: Buffer.from(createValidEventMessage()) },
        });

        assert.strictEqual(attempts, 1);
    });
});
