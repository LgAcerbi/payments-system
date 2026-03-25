import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PostgresPaymentDbSchema } from './payment.schema';

import { eq, and } from 'drizzle-orm';
import { Payment } from '../../domain';
import { postgresPaymentDbSchema } from './payment.schema';
import { PaymentRepository } from '../../application';

class PostgresPaymentRepository implements PaymentRepository {
    constructor(private readonly db: NodePgDatabase<PostgresPaymentDbSchema>) {}

    async createPayment(payment: Payment): Promise<Payment> {
        await this.db.insert(postgresPaymentDbSchema.payments).values(payment).returning();

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
            id: result.id,
            amount: result.amount,
            description: result.description,
            amountRefunded: result.amountRefunded,
            currency: result.currency,
            status: result.status,
            orderId: result.orderId,
            method: result.method,
            provider: result.provider,
            providerPaymentId: result.providerPaymentId,
            providerData: result.providerData,
            idempotencyKey: result.idempotencyKey,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
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
            id: result.id,
            idempotencyKey: result.idempotencyKey,
            amount: result.amount,
            description: result.description,
            amountRefunded: result.amountRefunded,
            currency: result.currency,
            status: result.status,
            orderId: result.orderId,
            method: result.method,
            provider: result.provider,
            providerPaymentId: result.providerPaymentId,
            providerData: result.providerData,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
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
            id: result.id,
            idempotencyKey: result.idempotencyKey,
            amount: result.amount,
            description: result.description,
            amountRefunded: result.amountRefunded,
            currency: result.currency,
            status: result.status,
            orderId: result.orderId,
            method: result.method,
            provider: result.provider,
            providerPaymentId: result.providerPaymentId,
            providerData: result.providerData,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
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
}

export default PostgresPaymentRepository;
export { PostgresPaymentRepository };
