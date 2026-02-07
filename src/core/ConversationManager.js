// src/core/ConversationManager.js
import { Logger } from '../utils/logger.js';

/**
 * 消息角色枚举
 */
export const MessageRole = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant'
};

/**
 * 默认配置
 */
const DEFAULT_MAX_HISTORY_TOKENS = 100000;

/**
 * 对话管理器类
 * 负责管理对话历史记录，包括添加消息、获取消息、修剪历史等功能
 */
export class ConversationManager {
    /**
     * @param {Object} [options] - 配置选项
     * @param {string} [options.systemPrompt] - 系统提示词
     * @param {number} [options.maxHistoryTokens] - 最大历史token数量
     */
    constructor(options = {}) {
        /** @type {Array<{role: string, content: string, timestamp: number}>} */
        this.messages = [];

        /** @type {string} */
        this.systemPrompt = options.systemPrompt || '';

        /** @type {number} */
        this.maxHistoryTokens = options.maxHistoryTokens || DEFAULT_MAX_HISTORY_TOKENS;

        Logger.info('对话管理器已初始化');
    }

    /**
     * 设置系统提示词
     * @param {string} prompt - 系统提示词内容
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        Logger.info('系统提示词已更新');
    }

    /**
     * 添加用户消息
     * @param {string} content - 消息内容
     */
    addUserMessage(content) {
        this.messages.push({
            role: MessageRole.USER,
            content,
            timestamp: Date.now()
        });

        this._trimHistoryIfNeeded();
        Logger.info('用户消息已添加');
    }

    /**
     * 添加助手消息
     * @param {string} content - 消息内容
     */
    addAssistantMessage(content) {
        this.messages.push({
            role: MessageRole.ASSISTANT,
            content,
            timestamp: Date.now()
        });

        this._trimHistoryIfNeeded();
        Logger.info('助手消息已添加');
    }

    /**
     * 获取格式化的消息列表（用于API调用）
     * @returns {Array<{role: string, content: string}>} 格式化的消息数组
     */
    getMessages() {
        const formatted = [];

        // 如果有系统提示词，添加到开头
        if (this.systemPrompt) {
            formatted.push({
                role: MessageRole.SYSTEM,
                content: this.systemPrompt
            });
        }

        // 添加所有对话消息
        for (const msg of this.messages) {
            formatted.push({
                role: msg.role,
                content: msg.content
            });
        }

        return formatted;
    }

    /**
     * 获取完整历史记录（包含时间戳）
     * @returns {Array<{role: string, content: string, timestamp: number}>} 完整消息历史
     */
    getFullHistory() {
        return [...this.messages];
    }

    /**
     * 获取当前系统提示词
     * @returns {string} 系统提示词
     */
    getSystemPrompt() {
        return this.systemPrompt;
    }

    /**
     * 清空对话历史
     */
    clear() {
        this.messages = [];
        Logger.info('对话历史已清空');
    }

    /**
     * 获取对话轮数
     * @returns {number} 对话轮数（用户+助手为一轮）
     */
    getTurnCount() {
        return Math.floor(this.messages.length / 2);
    }

    /**
     * 导出对话为文本格式
     * @returns {string} 文本格式的对话内容
     */
    exportToText() {
        if (this.messages.length === 0 && !this.systemPrompt) {
            return '(空对话)';
        }

        const lines = [];

        // 添加系统提示词
        if (this.systemPrompt) {
            lines.push('=== 系统提示词 ===');
            lines.push(this.systemPrompt);
            lines.push('');
        }

        // 添加对话历史
        if (this.messages.length > 0) {
            lines.push('=== 对话历史 ===');
            for (const msg of this.messages) {
                const timestamp = new Date(msg.timestamp).toLocaleString('zh-CN');
                const roleLabel = msg.role === MessageRole.USER ? '用户' : '助手';
                lines.push(`[${timestamp}] ${roleLabel}:`);
                lines.push(msg.content);
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    /**
     * 估算文本的token数量
     * @private
     * @param {string} text - 要估算的文本
     * @returns {number} 估算的token数量
     */
    _estimateTokens(text) {
        // 简单估算：英文约4字符/token，中文约1.5字符/token
        // 这里使用保守估计：约3字符/token
        return Math.ceil(text.length / 3);
    }

    /**
     * 计算当前历史记录的总token数
     * @private
     * @returns {number} 估算的token总数
     */
    _calculateTotalTokens() {
        let total = 0;

        // 计算系统提示词的token
        if (this.systemPrompt) {
            total += this._estimateTokens(this.systemPrompt);
        }

        // 计算所有消息的token
        for (const msg of this.messages) {
            total += this._estimateTokens(msg.content);
        }

        return total;
    }

    /**
     * 如果历史记录超过限制，修剪旧消息
     * @private
     */
    _trimHistoryIfNeeded() {
        const totalTokens = this._calculateTotalTokens();

        if (totalTokens <= this.maxHistoryTokens) {
            return;
        }

        Logger.warning(`历史记录超出token限制 (${totalTokens} > ${this.maxHistoryTokens})，开始修剪`);

        // 保留最新的消息，删除旧消息
        // 始终保留系统提示词
        // 以用户-助手对为单位删除，确保对话连贯性
        while (this._calculateTotalTokens() > this.maxHistoryTokens && this.messages.length >= 2) {
            // 删除最早的一对消息（用户 + 助手）
            this.messages.splice(0, 2);
        }

        Logger.info(`修剪完成，当前token数: ${this._calculateTotalTokens()}`);
    }
}
