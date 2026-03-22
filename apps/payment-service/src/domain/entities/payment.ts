type PaymentStatus =
    | 'INITIATED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED';

type PaymentProvider = 'stripe';

class Payment {
    public readonly id: string;
    public readonly amount: number;
    public readonly description: string | null;
    public readonly amountRefunded: number | null;
    public readonly currency: string;
    public readonly status: PaymentStatus;
    public readonly orderId: string;
    public readonly method: string;
    public readonly provider: PaymentProvider;
    public readonly providerPaymentId: string;
    public readonly providerData: Record<string, unknown> | null;
    public readonly idempotencyKey: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor({
        id,
        amount,
        description,
        amountRefunded,
        currency,
        status,
        orderId,
        method,
        provider,
        providerPaymentId,
        providerData,
        idempotencyKey,
        createdAt,
        updatedAt,
    }: {
        id: string;
        idempotencyKey: string;
        amount: number;
        description: string | null;
        amountRefunded: number | null;
        currency: string;
        status: PaymentStatus;
        orderId: string;
        method: string;
        provider: PaymentProvider;
        providerPaymentId: string
        providerData: Record<string, unknown> | null;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = id;
        this.amount = amount;
        this.description = description;
        this.amountRefunded = amountRefunded;
        this.currency = currency;
        this.status = status;
        this.orderId = orderId;
        this.method = method;
        this.provider = provider;
        this.providerPaymentId = providerPaymentId;
        this.providerData = providerData;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

export default Payment;
export { Payment };
