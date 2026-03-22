type PaymentStatus =
    | 'INITIATED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED';

class Payment {
    public readonly id: string;
    public readonly amount: number;
    public readonly currency: string;
    public readonly status: PaymentStatus;
    public readonly orderId: string;
    public readonly intentId: string;
    public readonly method: string;
    public readonly methodOptions: Record<string, unknown>;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor({
        id,
        amount,
        currency,
        status,
        orderId,
        intentId,
        method,
        methodOptions,
        createdAt,
        updatedAt,
    }: {
        id: string;
        amount: number;
        currency: string;
        status: PaymentStatus;
        orderId: string;
        intentId: string;
        method: string;
        methodOptions: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = id;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.orderId = orderId;
        this.intentId = intentId;
        this.method = method;
        this.methodOptions = methodOptions;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

export default Payment;
export { Payment };
