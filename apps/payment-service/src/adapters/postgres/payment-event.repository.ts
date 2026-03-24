import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PaymentEventDbSchema } from './payment-event.schema';

import { eq } from 'drizzle-orm';
import { paymentEventDbSchema } from './payment-event.schema';
import { PaymentEvent } from '../../domain';
import { PaymentEventRepository } from '../../application';

class PostgresPaymentEventRepository implements PaymentEventRepository {
    constructor(private readonly db: NodePgDatabase<PaymentEventDbSchema>) {}

    async createPaymentEvent(paymentEvent: PaymentEvent) {
        const [result] = await this.db.insert(paymentEventDbSchema.paymentEvents).values(paymentEvent).returning();

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
            .update(paymentEventDbSchema.paymentEvents)
            .set({ status, failureReason })
            .where(eq(paymentEventDbSchema.paymentEvents.id, id));
    }

    async updatePaymentEventPaymentId(id: PaymentEvent['id'], paymentId: PaymentEvent['paymentId']) {
        await this.db
            .update(paymentEventDbSchema.paymentEvents)
            .set({ paymentId })
            .where(eq(paymentEventDbSchema.paymentEvents.id, id));
    }

    async findPaymentEventByIdempotencyKey(idempotencyKey: PaymentEvent['idempotencyKey']): Promise<PaymentEvent> {
        const [result] = await this.db
            .select()
            .from(paymentEventDbSchema.paymentEvents)
            .where(eq(paymentEventDbSchema.paymentEvents.idempotencyKey, idempotencyKey));

        return result;
    }
}

export default PostgresPaymentEventRepository;
export { PostgresPaymentEventRepository };
