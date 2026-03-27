import { paymentProviderEnum } from './payment.schema';
import { pgEnum, pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

const paymentEventEnum = pgEnum('payment_event', [
    'payment-initiated',
    'payment-succeeded',
    'payment-processing',
    'payment-failed',
    'payment-canceled',
]);

const paymentEventStatusEnum = pgEnum('payment_event_status', ['created', 'processed', 'failed']);

const postgresPaymentEventSchema = pgTable('payment_events', {
    id: uuid('id').primaryKey(),
    paymentId: uuid('payment_id'),
    event: paymentEventEnum('event').notNull(),
    status: paymentEventStatusEnum('status').notNull(),
    failureReason: varchar('failure_reason', { length: 1024 }),
    idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull(),
    provider: paymentProviderEnum('provider').notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }).notNull(),
    providerRawPayload: jsonb('provider_raw_payload'),
    occurredAt: timestamp('occurred_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
});

const postgresPaymentEventDbSchema = {
    paymentEvents: postgresPaymentEventSchema,
};

type PostgresPaymentEventDbSchema = typeof postgresPaymentEventDbSchema;

export default postgresPaymentEventSchema;
export { postgresPaymentEventSchema, postgresPaymentEventDbSchema, paymentEventEnum, paymentEventStatusEnum };
export type { PostgresPaymentEventDbSchema };
