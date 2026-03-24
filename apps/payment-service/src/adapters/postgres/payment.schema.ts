import { pgEnum, pgTable, uuid, varchar, timestamp, jsonb, bigint } from "drizzle-orm/pg-core"

const paymentStatusEnum = pgEnum("payment_status", [
    "initiated",
    "processing",
    "succeeded",
    "failed",
    "canceled",
])

const paymentProviderEnum = pgEnum("payment_provider", [
    "stripe",
])

const postgresPaymentSchema = pgTable("payments", {
    id: uuid("id").primaryKey(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    amountRefunded: bigint("amount_refunded", { mode: "number" }),
    description: varchar("description", { length: 255 }),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: paymentStatusEnum("status").notNull(),
    orderId: uuid("order_id").notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }).notNull(),
    providerData: jsonb("provider_data"),
    idempotencyKey: varchar("idempotency_key", { length: 32 }).notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
})

const postgresPaymentDbSchema = {
    payments: postgresPaymentSchema,
}

type PostgresPaymentDbSchema = typeof postgresPaymentDbSchema

export default postgresPaymentSchema
export { postgresPaymentSchema, postgresPaymentDbSchema, paymentStatusEnum, paymentProviderEnum }
export type { PostgresPaymentDbSchema }