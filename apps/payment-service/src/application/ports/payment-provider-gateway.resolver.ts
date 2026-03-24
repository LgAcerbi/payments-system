import type { Payment } from '../../domain';
import type { PaymentProviderGateway } from './payment-provider.gateway';

interface PaymentProviderGatewayResolver {
  resolve(provider: Payment['provider']): PaymentProviderGateway;
}

export default PaymentProviderGatewayResolver;
export type { PaymentProviderGatewayResolver };