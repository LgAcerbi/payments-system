import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency } from './currency';

describe('Currency', () => {
    it('should create a currency', () => {
        const currency = new Currency('USD');

        assert.strictEqual(currency.code, 'USD');
    });

    it('should throw an error if the currency code is invalid', () => {
        assert.throws(() => new Currency('invalid'), {
            name: 'ValidationError',
            message: 'Currency must be a valid ISO 4217 currency code',
        });
    });
});
