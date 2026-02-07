// config.js
import dotenv from 'dotenv';

dotenv.config();

class Config {
    /** @type {string} */
    static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    /** @type {string} */
    static ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;

    /** @type {string} */
    static ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL;

    /**
     * 获取有效的API密钥
     * 优先使用 ANTHROPIC_AUTH_TOKEN（智谱AI），其次使用 ANTHROPIC_API_KEY（官方）
     * @returns {string} API密钥
     */
    static get API_KEY() {
        return this.ANTHROPIC_AUTH_TOKEN || this.ANTHROPIC_API_KEY;
    }

    /** @type {string} */
    static DEFAULT_MODEL_NAME = 'claude-3-5-sonnet-20241022';

    /** @type {string} */
    static DEFAULT_MODEL = process.env.DEFAULT_MODEL || this.DEFAULT_MODEL_NAME;

    /** @type {number} */
    static DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_TOKENS || '1024', 10);

    /** @type {number} */
    static DAILY_BUDGET = parseFloat(process.env.DAILY_BUDGET || '0.50');

    /** @type {boolean} */
    static IS_ZHIPU = !!this.ANTHROPIC_AUTH_TOKEN;

    /**
     * 验证配置
     * @throws {Error} 如果配置无效
     * @returns {boolean} 配置有效返回true
     */
    static validate() {
        if (!this.API_KEY) {
            throw new Error('未找到API Key！请检查.env文件中的 ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY');
        }
        if (isNaN(this.DAILY_BUDGET) || this.DAILY_BUDGET <= 0) {
            throw new Error('每日预算必须大于0');
        }
        return true;
    }

    /**
     * 获取模型价格（每百万tokens美元）
     * @param {string} [model] - 模型名称
     * @returns {{input: number, output: number}} 模型价格对象
     */
    static getModelPrices(model = this.DEFAULT_MODEL) {
        // 智谱AI GLM模型价格（人民币/百万tokens）
        const glmPrices = {
            'GLM-4.7': { input: 0.5, output: 0.5 },  // 智谱AI价格（约）
            'GLM-4': { input: 0.1, output: 0.1 }
        };

        // Anthropic Claude模型价格（美元/百万tokens）
        const claudePrices = {
            'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
            'claude-3-opus-20240229': { input: 15, output: 75 },
            'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
        };

        // 如果是GLM模型，返回GLM价格
        if (model.startsWith('GLM')) {
            return glmPrices[model] || glmPrices['GLM-4.7'];
        }

        // 否则返回Claude价格
        return claudePrices[model] || claudePrices[this.DEFAULT_MODEL_NAME];
    }

    /**
     * 获取API基础URL
     * @returns {string|undefined} 基础URL
     */
    static get BASE_URL() {
        return this.ANTHROPIC_BASE_URL;
    }
}

export { Config };
