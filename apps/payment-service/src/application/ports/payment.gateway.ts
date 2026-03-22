interface PaymentGateway {
    createPaymentIntent(amount: number, currency: string): Promise<{ id: string }>;
}

export default PaymentGateway;
export type { PaymentGateway };