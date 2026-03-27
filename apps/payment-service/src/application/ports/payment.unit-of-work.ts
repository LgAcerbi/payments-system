import type { PaymentEventRepository } from './payment-event.repository';
import type { PaymentRepository } from './payment.repository';

type PaymentTransactionalRepositories = {
    paymentRepository: PaymentRepository;
    paymentEventRepository: PaymentEventRepository;
};

interface PaymentUnitOfWork {
    runInTransaction<T>(callback: (repositories: PaymentTransactionalRepositories) => Promise<T>): Promise<T>;
}

export default PaymentUnitOfWork;
export type { PaymentUnitOfWork, PaymentTransactionalRepositories };
