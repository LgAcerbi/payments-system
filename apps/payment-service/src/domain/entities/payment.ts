class Payment {
    constructor(
        public readonly id: string,
        public readonly amount: number,
        public readonly currency: string,
        public readonly status: 'INITIATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED',
        public readonly orderId: string,
        public readonly intentId: string,
        public readonly method: string,
        public readonly methodOptions: Record<string, unknown>,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) {}
}

export default Payment;
export { Payment };