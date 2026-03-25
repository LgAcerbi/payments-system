import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PostgresPaymentEventDbSchema } from './payment-event.schema';

import { eq } from 'drizzle-orm';
import { postgresPaymentEventDbSchema } from './payment-event.schema';
import { PaymentEvent } from '../../domain';
import { PaymentEventRepository } from '../../application';

class PostgresPaymentEventRepository implements PaymentEventRepository {
    constructor(private readonly db: NodePgDatabase<PostgresPaymentEventDbSchema>) {}

    async createPaymentEvent(paymentEvent: PaymentEvent) {
        const [result] = await this.db
            .insert(postgresPaymentEventDbSchema.paymentEvents)
            .values(paymentEvent)
            .returning();

        return new PaymentEvent({
            ...result,
        });
    }

    async updatePaymentEventStatus(
        id: PaymentEvent['id'],
        status: PaymentEvent['status'],
        failureReason?: PaymentEvent['failureReason'],
    ) {
        await this.db
            .update(postgresPaymentEventDbSchema.paymentEvents)
            .set({ status, failureReason })
            .where(eq(postgresPaymentEventDbSchema.paymentEvents.id, id));
    }

    async updatePaymentEventPaymentId(id: PaymentEvent['id'], paymentId: PaymentEvent['paymentId']) {
        await this.db
            .update(postgresPaymentEventDbSchema.paymentEvents)
            .set({ paymentId })
            .where(eq(postgresPaymentEventDbSchema.paymentEvents.id, id));
    }

    async findPaymentEventByIdempotencyKey(idempotencyKey: PaymentEvent['idempotencyKey']) {
        const [result] = await this.db
            .select()
            .from(postgresPaymentEventDbSchema.paymentEvents)
            .where(eq(postgresPaymentEventDbSchema.paymentEvents.idempotencyKey, idempotencyKey));

        if (!result) {
            return null;
        }

        return result;
    }
}

export default PostgresPaymentEventRepository;
export { PostgresPaymentEventRepository };
