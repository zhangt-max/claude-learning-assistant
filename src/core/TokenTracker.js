// src/core/TokenTracker.js
import { Config } from '../../config.js';
import { calculateCost, formatCost, formatTokens } from '../utils/cost-calculator.js';

/**
 * Token追踪器类
 * 用于追踪和管理API调用使用的token数量和成本
 */
export class TokenTracker {
    /**
     * @param {number} [budget] - 每日预算（美元），默认使用Config.DAILY_BUDGET
     */
    constructor(budget = Config.DAILY_BUDGET) {
        this.budget = budget;
        this.usage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cost: 0
        };
    }

    /**
     * 添加使用记录
     * @param {number} inputTokens - 输入tokens数量
     * @param {number} outputTokens - 输出tokens数量
     * @param {string} [model] - 模型名称
     * @returns {{inputCost: number, outputCost: number, totalCost: number, inputTokens: number, outputTokens: number, totalTokens: number}} 成本详情
     */
    addUsage(inputTokens, outputTokens, model = Config.DEFAULT_MODEL) {
        const costDetails = calculateCost(inputTokens, outputTokens, model);

        this.usage.inputTokens += costDetails.inputTokens;
        this.usage.outputTokens += costDetails.outputTokens;
        this.usage.totalTokens += costDetails.totalTokens;
        this.usage.cost += costDetails.totalCost;

        return costDetails;
    }

    /**
     * 获取当前成本
     * @returns {number} 当前总成本
     */
    getCurrentCost() {
        return this.usage.cost;
    }

    /**
     * 检查预算状态
     * @returns {{currentCost: number, usage: Object, remaining: number, isNearLimit: boolean, isExceeded: boolean, shouldWarn: boolean}} 预算状态
     */
    checkBudget() {
        const currentCost = this.getCurrentCost();
        const remaining = this.budget - currentCost;
        const usagePercentage = (currentCost / this.budget) * 100;

        // 接近限制：使用超过80%
        const isNearLimit = usagePercentage >= 80;
        // 超出预算：使用超过100%
        const isExceeded = usagePercentage >= 100;
        // 应该警告：使用超过70%
        const shouldWarn = usagePercentage >= 70;

        return {
            currentCost,
            usage: { ...this.usage },
            remaining,
            isNearLimit,
            isExceeded,
            shouldWarn
        };
    }

    /**
     * 获取详细报告
     * @returns {{budget: number, currentCost: number, remaining: number, usage: Object, percentage: number, status: string}} 详细报告
     */
    getReport() {
        const currentCost = this.getCurrentCost();
        const remaining = this.budget - currentCost;
        const percentage = (currentCost / this.budget) * 100;

        let status = '正常';
        if (percentage >= 100) {
            status = '超出预算';
        } else if (percentage >= 80) {
            status = '接近限制';
        } else if (percentage >= 70) {
            status = '需要关注';
        }

        return {
            budget: this.budget,
            currentCost,
            remaining,
            usage: { ...this.usage },
            percentage,
            status
        };
    }

    /**
     * 显示报告（返回格式化的字符串）
     * @returns {string} 格式化的报告字符串
     */
    displayReport() {
        const report = this.getReport();

        return `
╔═══════════════════════════════════════╗
║          Token 使用报告               ║
╠═══════════════════════════════════════╣
║ 状态: ${report.status.padEnd(30)}║
║ 预算: ${formatCost(report.budget).padStart(10)} / ${formatCost(report.budget).padStart(10)} ║
║ 已用: ${formatCost(report.currentCost).padStart(10)} (${report.percentage.toFixed(1).padStart(6)}%)  ║
║ 剩余: ${formatCost(report.remaining).padStart(10)}                 ║
╠═══════════════════════════════════════╣
║ 输入Tokens: ${formatTokens(report.usage.inputTokens).padStart(15)} ║
║ 输出Tokens: ${formatTokens(report.usage.outputTokens).padStart(15)} ║
║ 总计Tokens: ${formatTokens(report.usage.totalTokens).padStart(15)} ║
╚═══════════════════════════════════════╝
        `.trim();
    }

    /**
     * 重置追踪器
     */
    reset() {
        this.usage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cost: 0
        };
    }
}
