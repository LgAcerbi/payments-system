import type { Payment } from '../../domain';
import type { PaymentEventMapper } from './payment-event.mapper';

interface PaymentEventMapperResolver {
  resolve(provider: Payment['provider']): PaymentEventMapper['toPaymentProviderEvent'];
}

export default PaymentEventMapperResolver;
export type { PaymentEventMapperResolver };