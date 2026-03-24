import type { PaymentEventMapperResolver } from "../../application";
import type { PaymentEventMapper } from "../../application";
import type { Payment } from "../../domain";

import { ValidationError } from "@workspace/errors";

class PaymentEventMapperResolverAdapter implements PaymentEventMapperResolver {
    constructor(private readonly paymentEventMapper: Map<Payment['provider'], PaymentEventMapper['toPaymentProviderEvent']>) {}

    public resolve(provider: Payment['provider']): PaymentEventMapper['toPaymentProviderEvent'] {
        const paymentEventMapper = this.paymentEventMapper.get(provider);

        if (!paymentEventMapper) {
            throw new ValidationError(`Payment event mapper not found for provider: ${provider}`);
        }

        return paymentEventMapper;
    }
}

export default PaymentEventMapperResolverAdapter;
export { PaymentEventMapperResolverAdapter };