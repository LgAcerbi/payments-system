interface PaymentProviderGateway {
    createPayment(amount: number, currency: string): Promise<{ id: string }>;
    confirmPayment(paymentId: string, paymentMethodId: string): Promise<void>;
}

export default PaymentProviderGateway;
export type { PaymentProviderGateway };