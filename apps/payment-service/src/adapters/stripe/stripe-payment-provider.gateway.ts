import type { PaymentProviderGateway } from '../../application';

import { Stripe as StripeLib } from 'stripe';

class StripePaymentProviderGateway implements PaymentProviderGateway {
    private readonly stripeInstance: StripeLib;

    constructor(privateStripeKey: string) {
        this.stripeInstance = new StripeLib(privateStripeKey);
    }

    async createPayment(amount: number, currency: string): Promise<{ id: string }> {
        const paymentIntent = await this.stripeInstance.paymentIntents.create({
            amount,
            currency: currency.toLowerCase(),
        });

        return { id: paymentIntent.id };
    }

    async confirmPaymentIntent(paymentId: string, paymentMethodId: string): Promise<void> {
        await this.stripeInstance.paymentIntents.confirm(paymentId, {
            payment_method: paymentMethodId,
        });
    }
}

export default StripePaymentProviderGateway;
export { StripePaymentProviderGateway };
