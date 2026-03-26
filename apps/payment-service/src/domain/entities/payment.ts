import { ValidationError } from '@workspace/errors';

type PaymentStatus = 'initiated' | 'processing' | 'succeeded' | 'failed' | 'canceled';
type PaymentProvider = 'stripe';

const currencyRegex = /^[A-Z]{3}$/;

class Payment {
    private readonly statusDependencies = new Map<PaymentStatus, PaymentStatus[]>([
        ['succeeded', ['processing']],
        ['processing', ['initiated']],
        ['failed', ['processing']],
        ['canceled', ['initiated']],
    ]);

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
    public readonly providerData: unknown;
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
        providerPaymentId: string;
        providerData: unknown;
        createdAt: Date;
        updatedAt: Date;
    }) {
        if (amount <= 0) {
            throw new ValidationError('Amount must be greater than 0');
        }

        if (!orderId) {
            throw new ValidationError('Order ID is required');
        }

        if (!currencyRegex.test(currency)) {
            throw new ValidationError('Currency must be a valid ISO 4217 currency code');
        }

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

    public canTransitionTo(status: PaymentStatus): boolean {
        const statusDependencies = this.statusDependencies.get(this.status);

        if (this.status === status) {
            return false;
        }

        if (statusDependencies && !statusDependencies.includes(status)) {
            return false;
        }

        return true;
    }
}

export default Payment;
export { Payment };
