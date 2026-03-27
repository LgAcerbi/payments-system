import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PostgresDbSchema } from './db.schema';

import { eq, and } from 'drizzle-orm';
import { Payment, Currency } from '../../domain';
import { postgresPaymentDbSchema } from './payment.schema';
import { PaymentRepository } from '../../application';

class PostgresPaymentRepository implements PaymentRepository {
    constructor(private readonly db: NodePgDatabase<PostgresDbSchema>) {}

    async createPayment(payment: Payment): Promise<Payment> {
        await this.db
            .insert(postgresPaymentDbSchema.payments)
            .values({
                ...payment,
                currency: payment.currency.code,
            })
            .returning();

        return payment;
    }

    async getPaymentById(id: string) {
        const [result] = await this.db
            .select()
            .from(postgresPaymentDbSchema.payments)
            .where(eq(postgresPaymentDbSchema.payments.id, id));

        if (!result) {
            return null;
        }

        const payment = new Payment({
            ...result,
            currency: new Currency(result.currency),
        });

        return payment;
    }

    async getPaymentByProviderPaymentId(providerId: string, provider: Payment['provider']) {
        const [result] = await this.db
            .select()
            .from(postgresPaymentDbSchema.payments)
            .where(
                and(
                    eq(postgresPaymentDbSchema.payments.providerPaymentId, providerId),
                    eq(postgresPaymentDbSchema.payments.provider, provider),
                ),
            );

        if (!result) {
            return null;
        }

        const payment = new Payment({
            ...result,
            currency: new Currency(result.currency),
        });

        return payment;
    }

    async getPaymentByOrderId(orderId: string) {
        const [result] = await this.db
            .select()
            .from(postgresPaymentDbSchema.payments)
            .where(eq(postgresPaymentDbSchema.payments.orderId, orderId));

        if (!result) {
            return null;
        }

        const payment = new Payment({
            ...result,
            currency: new Currency(result.currency),
        });

        return payment;
    }

    async confirmPaymentIntent(paymentId: string): Promise<void> {
        await this.db
            .update(postgresPaymentDbSchema.payments)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(eq(postgresPaymentDbSchema.payments.id, paymentId));
    }

    async updatePaymentStatusById(paymentId: string, status: Payment['status']): Promise<void> {
        await this.db
            .update(postgresPaymentDbSchema.payments)
            .set({ status, updatedAt: new Date() })
            .where(eq(postgresPaymentDbSchema.payments.id, paymentId));
    }

    async updatePaymentStatusByProviderPaymentId(
        providerPaymentId: string,
        status: Payment['status'],
        provider: Payment['provider'],
    ): Promise<void> {
        await this.db
            .update(postgresPaymentDbSchema.payments)
            .set({ status, updatedAt: new Date() })
            .where(
                and(
                    eq(postgresPaymentDbSchema.payments.providerPaymentId, providerPaymentId),
                    eq(postgresPaymentDbSchema.payments.provider, provider),
                ),
            );
    }
    async findPaymentByIdempotencyKey(idempotencyKey: Payment['idempotencyKey']): Promise<Payment | null> {
        const [result] = await this.db
            .select()
            .from(postgresPaymentDbSchema.payments)
            .where(eq(postgresPaymentDbSchema.payments.idempotencyKey, idempotencyKey));

        if (!result) {
            return null;
        }

        const payment = new Payment({
            ...result,
            currency: new Currency(result.currency),
        });

        return payment;
    }
}

export default PostgresPaymentRepository;
export { PostgresPaymentRepository };
