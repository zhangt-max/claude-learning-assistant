// src/utils/cost-calculator.js
import { Config } from '../../config.js';

/**
 * 计算API调用成本
 * @param {number} inputTokens - 输入tokens数量
 * @param {number} outputTokens - 输出tokens数量
 * @param {string} model - 模型名称
 * @returns {{inputCost: number, outputCost: number, totalCost: number, inputTokens: number, outputTokens: number, totalTokens: number}} 成本详情
 * @throws {Error} 当输入参数无效时抛出错误
 */
export function calculateCost(inputTokens, outputTokens, model) {
    // 输入验证
    if (typeof inputTokens !== 'number' || isNaN(inputTokens) || inputTokens < 0) {
        throw new Error('inputTokens 必须是有效的非负数');
    }
    if (typeof outputTokens !== 'number' || isNaN(outputTokens) || outputTokens < 0) {
        throw new Error('outputTokens 必须是有效的非负数');
    }

    const prices = Config.getModelPrices(model);

    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;
    const totalCost = inputCost + outputCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
    };
}

/**
 * 格式化成本显示
 * @param {number} cost - 成本金额
 * @returns {string} 格式化的成本字符串
 */
export function formatCost(cost) {
    if (cost == null || typeof cost !== 'number' || isNaN(cost)) {
        return '$0.000000';
    }
    return `$${cost.toFixed(6)}`;
}

/**
 * 格式化token数量
 * @param {number} tokens - token数量
 * @returns {string} 格式化的token字符串
 */
export function formatTokens(tokens) {
    return tokens.toLocaleString();
}
