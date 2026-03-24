import type { PaymentProviderEventDto } from '@workspace/payment';
import type { Payment, PaymentEvent } from '../../domain';

interface PaymentEventMapper {
    toPaymentProviderEvent(paymentProviderEvent: PaymentProviderEventDto): {
        paymentEvent: Omit<PaymentEvent, 'id' | 'paymentId' | 'createdAt' | 'status' | 'failureReason'>;
        paymentData: Pick<Payment, 'status'>;
    };
}

export default PaymentEventMapper;
export type { PaymentEventMapper };
