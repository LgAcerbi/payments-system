import { Stripe as StripeLib } from 'stripe';

class Stripe {
    private readonly stripeInstance: StripeLib;

    constructor(privateStripeKey: string) {
        this.stripeInstance = new StripeLib(privateStripeKey);
    }

    async createPaymentIntent(amount: number, currency: string): Promise<StripeLib.Response<StripeLib.PaymentIntent>> {
        return this.stripeInstance.paymentIntents.create({
            amount,
            currency,
        });
    }
}

export default Stripe;
export { Stripe };