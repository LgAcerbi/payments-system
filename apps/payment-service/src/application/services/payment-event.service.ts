import type { PaymentRepository, PaymentEventRepository } from '../';

import { randomUUID } from 'node:crypto';
import { NotFoundError, ConflictError } from '@workspace/errors';
import { PaymentEvent } from '../../domain';

const eventStatusDependencies = {
    'payment-succeeded': ['processing'],
    'payment-processing': ['initiated'],
    'payment-failed': ['processing'],
    'payment-canceled': ['initiated'],
};

class PaymentEventService {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentEventRepository: PaymentEventRepository,
    ) {}

    async handlePaymentEvent(paymentEvent: Omit<PaymentEvent, 'id' | 'paymentId' | 'createdAt'>): Promise<void> {
        if (paymentEvent.event === 'payment-initiated') {
            return;
        }

        const existingPaymentEvent = await this.paymentEventRepository.findPaymentEventByIdempotencyKey(
            paymentEvent.idempotencyKey,
        );

        if (existingPaymentEvent) {
            throw new ConflictError(`Payment event with idempotency key ${paymentEvent.idempotencyKey} already exists`);
        }

        const createdPaymentEvent = new PaymentEvent({ ...paymentEvent, id: randomUUID(), paymentId: null, createdAt: new Date() });

        await this.paymentEventRepository.createPaymentEvent(createdPaymentEvent);

        const payment = await this.paymentRepository.getPaymentByProviderPaymentId(
            paymentEvent.providerPaymentId,
            paymentEvent.provider,
        );

        if (!payment) {
            throw new NotFoundError(`Payment with provider payment id ${paymentEvent.providerPaymentId} not found`);
        }

        await this.paymentEventRepository.updatePaymentEventPaymentId(createdPaymentEvent.id, payment.id);

        if (paymentEvent.event === 'payment-succeeded' && payment.status === `${paymentEvent.status}`) {
            return;
        }

        if (!eventStatusDependencies[paymentEvent.event].includes(payment.status)) {
            throw new ConflictError(
                `Cannot set payment status to "${paymentEvent.status}" because payment is not in "${eventStatusDependencies[paymentEvent.event].join(', ').trim()}" statuses`,
            );
        }

        await this.paymentRepository.updatePaymentStatusByProviderPaymentId(
            paymentEvent.providerPaymentId,
            paymentEvent.status,
            paymentEvent.provider,
        );
    }
}

export default PaymentEventService;
export { PaymentEventService };
