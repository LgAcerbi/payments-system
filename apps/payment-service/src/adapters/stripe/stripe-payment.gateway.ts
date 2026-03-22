import type { PaymentGateway } from '../../application/ports/payment.gateway';

import { Stripe as StripeLib } from 'stripe';

class StripePaymentGateway implements PaymentGateway {
    private readonly stripeInstance: StripeLib;

    constructor(privateStripeKey: string) {
        this.stripeInstance = new StripeLib(privateStripeKey);
    }

    async createPaymentIntent(
        amount: number,
        currency: string,
    ): Promise<{ id: string }> {
        const paymentIntent = await this.stripeInstance.paymentIntents.create({
            amount,
            currency,
        });

        return { id: paymentIntent.id };
    }
}

export default StripePaymentGateway;
export { StripePaymentGateway };
