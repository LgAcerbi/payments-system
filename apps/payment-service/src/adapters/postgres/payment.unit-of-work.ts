import type { PostgresDbSchema } from './db.schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PaymentUnitOfWork, PaymentTransactionalRepositories } from '../../application';

import { PostgresPaymentEventRepository } from './payment-event.repository';
import { PostgresPaymentRepository } from './payment.repository';

class PostgresPaymentUnitOfWork implements PaymentUnitOfWork {
    constructor(private readonly db: NodePgDatabase<PostgresDbSchema>) {}

    async runInTransaction<T>(callback: (repositories: PaymentTransactionalRepositories) => Promise<T>): Promise<T> {
        return this.db.transaction(async (tx) => {
            const paymentRepository = new PostgresPaymentRepository(tx);
            const paymentEventRepository = new PostgresPaymentEventRepository(tx);

            return callback({
                paymentRepository,
                paymentEventRepository,
            });
        });
    }
}

export default PostgresPaymentUnitOfWork;
export { PostgresPaymentUnitOfWork };
