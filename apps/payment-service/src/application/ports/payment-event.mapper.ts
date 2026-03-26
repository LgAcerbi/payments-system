import type { PaymentProviderEventDto } from '@workspace/payment';
import type { Payment, PaymentEvent } from '../../domain';

interface PaymentEventMapper {
    toPaymentProviderEvent(paymentProviderEvent: PaymentProviderEventDto): {
        paymentEvent: Pick<
            PaymentEvent,
            | 'event'
            | 'occurredAt'
            | 'idempotencyKey'
            | 'provider'
            | 'providerEventId'
            | 'providerPaymentId'
            | 'providerRawPayload'
        >;
        paymentData: Pick<Payment, 'status'>;
    };
}

export default PaymentEventMapper;
export type { PaymentEventMapper };
