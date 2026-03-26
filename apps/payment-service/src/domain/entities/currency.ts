import { ValidationError } from '@workspace/errors';

const currencyRegex = /^[A-Z]{3}$/;

class Currency {
    private readonly codeValue: string;

    constructor(code: string) {
        const normalizedCode = code.trim().toUpperCase();

        if (!currencyRegex.test(normalizedCode)) {
            throw new ValidationError('Currency must be a valid ISO 4217 currency code');
        }

        this.codeValue = normalizedCode;
    }

    public get code(): string {
        return this.codeValue;
    }
}

export default Currency;
export { Currency };
