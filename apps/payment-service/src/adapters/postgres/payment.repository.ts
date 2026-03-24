import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PaymentDbSchema } from './payment.schema';

import { eq, and } from 'drizzle-orm';
import { Payment } from '../../domain';
import { paymentDbSchema } from './payment.schema';
import { PaymentRepository } from '../../application';

class PostgresPaymentRepository implements PaymentRepository {
    constructor(private readonly db: NodePgDatabase<PaymentDbSchema>) {}

    async createPayment(payment: Payment): Promise<Payment> {
        await this.db
            .insert(paymentDbSchema.payments)
            .values(payment)
            .returning();

        return payment;
    }

    async getPaymentById(id: string): Promise<Payment> {
        const [result] = await this.db.select().from(paymentDbSchema.payments).where(eq(paymentDbSchema.payments.id, id));
        
        const payment = new Payment(
            {
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
            }
        );

        return payment;
    }

    async getPaymentByProviderPaymentId(providerId: string): Promise<Payment> {
        const [result] = await this.db.select().from(paymentDbSchema.payments).where(eq(paymentDbSchema.payments.providerPaymentId, providerId));
        
        const payment = new Payment(
            {
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
            }
        );

        return payment;
    }

    async getPaymentByOrderId(orderId: string): Promise<Payment> {
        const [result] = await this.db.select().from(paymentDbSchema.payments).where(eq(paymentDbSchema.payments.orderId, orderId));
        
        const payment = new Payment(
            {
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
            }
        );

        return payment;
    }

    async confirmPaymentIntent(paymentId: string): Promise<void> {
        await this.db.update(paymentDbSchema.payments).set({ status: 'processing' }).where(eq(paymentDbSchema.payments.id, paymentId));
    }

    async updatePaymentStatusById(paymentId: string, status: Payment['status']): Promise<void> {
        await this.db.update(paymentDbSchema.payments).set({ status }).where(eq(paymentDbSchema.payments.id, paymentId));
    }

    async updatePaymentStatusByProviderPaymentId(providerPaymentId: string, status: Payment['status'], provider: Payment['provider']): Promise<void> {
        await this.db.update(paymentDbSchema.payments).set({ status }).where(and(eq(paymentDbSchema.payments.providerPaymentId, providerPaymentId), eq(paymentDbSchema.payments.provider, provider)));
    }
}

export default PostgresPaymentRepository;
export { PostgresPaymentRepository };
