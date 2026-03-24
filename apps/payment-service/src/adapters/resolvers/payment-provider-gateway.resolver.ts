import type { PaymentProviderGatewayResolver } from "../../application";
import type { PaymentProviderGateway } from "../../application";
import type { Payment } from "../../domain";

import { ValidationError } from "@workspace/errors";

class PaymentProviderGatewayResolverAdapter implements PaymentProviderGatewayResolver {
    constructor(private readonly paymentProviderGateways: Map<Payment['provider'], PaymentProviderGateway>) {}

    public resolve(provider: Payment['provider']): PaymentProviderGateway {
        const paymentProviderGateway = this.paymentProviderGateways.get(provider);

        if (!paymentProviderGateway) {
            throw new ValidationError(`Payment provider gateway not found for provider: ${provider}`);
        }

        return paymentProviderGateway;
    }
}

export default PaymentProviderGatewayResolverAdapter
export { PaymentProviderGatewayResolverAdapter }