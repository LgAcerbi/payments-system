import type { PaymentProviderGateway } from '../../application/ports/payment.gateway';

import { Stripe as StripeLib } from 'stripe';

class StripePaymentGateway implements PaymentProviderGateway {
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

    async confirmPayment(paymentId: string, paymentMethodId: string): Promise<void> {
        await this.stripeInstance.paymentIntents.confirm(paymentId, {
            payment_method: paymentMethodId,
        });
    }
}

export default StripePaymentGateway;
export { StripePaymentGateway };
