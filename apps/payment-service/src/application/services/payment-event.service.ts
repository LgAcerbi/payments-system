import type { PaymentRepository, PaymentEventRepository } from '../';
import type { Payment } from '../../domain';

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

    async handlePaymentEvent(
        paymentEvent: Omit<PaymentEvent, 'id' | 'paymentId' | 'createdAt' | 'status' | 'failureReason'>,
        paymentData: Pick<Payment, 'status'>,
    ): Promise<void> {
        if (paymentEvent.event === 'payment-initiated') {
            return;
        }

        const existingPaymentEvent = await this.paymentEventRepository.findPaymentEventByIdempotencyKey(
            paymentEvent.idempotencyKey,
        );

        if (existingPaymentEvent) {
            throw new ConflictError(`Payment event with idempotency key ${paymentEvent.idempotencyKey} already exists`);
        }

        const createdPaymentEvent = new PaymentEvent({
            ...paymentEvent,
            id: randomUUID(),
            status: 'created',
            paymentId: null,
            failureReason: null,
            createdAt: new Date(),
        });

        await this.paymentEventRepository.createPaymentEvent(createdPaymentEvent);

        const payment = await this.paymentRepository.getPaymentByProviderPaymentId(
            paymentEvent.providerPaymentId,
            paymentEvent.provider,
        );

        if (!payment) {
            const errorMessage = `Payment with provider payment id ${paymentEvent.providerPaymentId} not found`;

            await this.paymentEventRepository.updatePaymentEventStatus(createdPaymentEvent.id, 'failed', errorMessage);

            throw new NotFoundError(errorMessage);
        }

        await this.paymentEventRepository.updatePaymentEventPaymentId(createdPaymentEvent.id, payment.id);

        const { status: incomingPaymentStatus } = paymentData;

        if (paymentEvent.event === 'payment-succeeded' && payment.status === `${incomingPaymentStatus}`) {
            await this.paymentEventRepository.updatePaymentEventStatus(createdPaymentEvent.id, 'processed');

            return;
        }

        if (!eventStatusDependencies[paymentEvent.event].includes(payment.status)) {
            const errorMessage = `Cannot set payment status to "${incomingPaymentStatus}" because payment is not in "${eventStatusDependencies[paymentEvent.event].join(', ').trim()}" statuses`;

            await this.paymentEventRepository.updatePaymentEventStatus(createdPaymentEvent.id, 'failed', errorMessage);

            throw new ConflictError(errorMessage);
        }

        await this.paymentRepository.updatePaymentStatusByProviderPaymentId(
            paymentEvent.providerPaymentId,
            incomingPaymentStatus,
            paymentEvent.provider,
        );

        await this.paymentEventRepository.updatePaymentEventStatus(createdPaymentEvent.id, 'processed');
    }
}

export default PaymentEventService;
export { PaymentEventService };
