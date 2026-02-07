import { Config } from '../config.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Config', () => {
    it('should have default values', () => {
        assert.strictEqual(typeof Config.DEFAULT_MODEL, 'string');
        assert.strictEqual(typeof Config.DEFAULT_MAX_TOKENS, 'number');
    });

    it('should get model prices', () => {
        const prices = Config.getModelPrices();
        assert.strictEqual(typeof prices.input, 'number');
        assert.strictEqual(typeof prices.output, 'number');
    });

    it('should have correct DEFAULT_MODEL default value', () => {
        assert.strictEqual(Config.DEFAULT_MODEL_NAME, 'claude-3-5-sonnet-20241022');
        assert.ok(Config.DEFAULT_MODEL.includes('claude'));
    });

    it('should have correct DAILY_BUDGET default value', () => {
        assert.strictEqual(typeof Config.DAILY_BUDGET, 'number');
        assert.ok(Config.DAILY_BUDGET > 0);
    });

    it('should throw error when API key is missing', () => {
        const originalKey = Config.ANTHROPIC_API_KEY;
        Config.ANTHROPIC_API_KEY = '';
        assert.throws(() => Config.validate(), /API Key/);
        Config.ANTHROPIC_API_KEY = originalKey;
    });

    it('should throw error when budget is invalid', () => {
        const originalKey = Config.ANTHROPIC_API_KEY;
        const originalBudget = Config.DAILY_BUDGET;
        Config.ANTHROPIC_API_KEY = 'test-key';
        Config.DAILY_BUDGET = 0;
        assert.throws(() => Config.validate(), /每日预算/);
        Config.ANTHROPIC_API_KEY = originalKey;
        Config.DAILY_BUDGET = originalBudget;
    });

    it('should return default prices for invalid model', () => {
        const prices = Config.getModelPrices('invalid-model-name');
        assert.strictEqual(typeof prices.input, 'number');
        assert.strictEqual(typeof prices.output, 'number');
        assert.strictEqual(prices.input, 3);
        assert.strictEqual(prices.output, 15);
    });

    it('should get correct prices for different models', () => {
        const sonnetPrices = Config.getModelPrices('claude-3-5-sonnet-20241022');
        assert.strictEqual(sonnetPrices.input, 3);
        assert.strictEqual(sonnetPrices.output, 15);

        const opusPrices = Config.getModelPrices('claude-3-opus-20240229');
        assert.strictEqual(opusPrices.input, 15);
        assert.strictEqual(opusPrices.output, 75);

        const haikuPrices = Config.getModelPrices('claude-3-haiku-20240307');
        assert.strictEqual(haikuPrices.input, 0.25);
        assert.strictEqual(haikuPrices.output, 1.25);
    });
});
