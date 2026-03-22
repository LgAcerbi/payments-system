interface PaymentGateway {
    createPaymentIntent(amount: number, currency: string): Promise<{ id: string }>;
    confirmPaymentIntent(intentId: string, paymentMethodId: string): Promise<void>;
}

export default PaymentGateway;
export type { PaymentGateway };