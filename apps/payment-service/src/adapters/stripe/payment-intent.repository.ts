import type { Stripe as StripeLib } from 'stripe';

import { Stripe } from "./instance";

class PaymentIntentRepository {
    constructor(private readonly stripe: Stripe) { }

    async createPaymentIntent(amount: number, currency: string): Promise<StripeLib.Response<StripeLib.PaymentIntent>> {
        return this.stripe.createPaymentIntent(amount, currency);
    }
}

export default PaymentIntentRepository;
export { PaymentIntentRepository };