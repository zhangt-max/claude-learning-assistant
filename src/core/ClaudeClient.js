// src/core/ClaudeClient.js
import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../../config.js';
import { Logger } from '../utils/logger.js';

/**
 * API错误类型
 * 用于表示Claude API调用过程中发生的错误
 */
export class ClaudeAPIError extends Error {
    /**
     * @param {string} message - 错误消息
     * @param {string} code - 错误代码
     * @param {Object} [details] - 错误详情
     */
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ClaudeAPIError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Claude API客户端封装类
 * 提供与Anthropic API交互的完整功能
 */
export class ClaudeClient {
    /**
     * @param {Object} [options] - 配置选项
     * @param {string} [options.apiKey] - API密钥，默认使用Config.ANTHROPIC_API_KEY
     * @param {string} [options.model] - 模型名称，默认使用Config.DEFAULT_MODEL
     * @param {number} [options.maxTokens] - 最大输出tokens，默认使用Config.DEFAULT_MAX_TOKENS
     * @param {number} [options.timeout] - 请求超时时间（毫秒），默认60000
     * @param {number} [options.maxRetries] - 最大重试次数，默认3
     */
    constructor(options = {}) {
        // 验证配置
        Config.validate();

        // 构建客户端配置
        const clientConfig = {
            apiKey: options.apiKey || Config.API_KEY,
            timeout: options.timeout || 60000
        };

        // 如果设置了自定义BASE_URL（如智谱AI），添加到配置中
        if (Config.BASE_URL) {
            clientConfig.baseURL = Config.BASE_URL;
            Logger.info(`使用自定义API端点: ${Config.BASE_URL}`);
        }

        // 初始化Anthropic客户端
        this.client = new Anthropic(clientConfig);

        // 设置模型和配置
        this.model = options.model || Config.DEFAULT_MODEL;
        this.maxTokens = options.maxTokens || Config.DEFAULT_MAX_TOKENS;
        this.maxRetries = options.maxRetries || 3;

        const provider = Config.IS_ZHIPU ? '智谱AI' : 'Anthropic';
        Logger.info(`${provider}客户端已初始化，使用模型: ${this.model}`);
    }

    /**
     * 发送消息到Claude API
     * @param {Array<{role: string, content: string}>} messages - 消息历史数组
     * @param {Object} [options] - 调用选项
     * @param {string} [options.model] - 覆盖默认模型
     * @param {number} [options.maxTokens] - 覆盖默认最大tokens
     * @param {string} [options.system] - 系统提示
     * @param {number} [options.temperature] - 温度参数（0-1）
     * @returns {Promise<{content: string, usage: Object, model: string, id: string}>} API响应
     * @throws {ClaudeAPIError} 当API调用失败时抛出
     */
    async sendMessage(messages, options = {}) {
        // 构建API参数
        const apiParams = {
            model: options.model || this.model,
            max_tokens: options.maxTokens || this.maxTokens,
            messages: messages
        };

        // 添加可选参数
        if (options.system) {
            apiParams.system = options.system;
        }

        if (options.temperature !== undefined) {
            apiParams.temperature = options.temperature;
        }

        // 执行可重试的请求
        return this._retryableRequest(apiParams);
    }

    /**
     * 可重试的API请求（内部方法）
     * @private
     * @param {Object} params - API参数
     * @param {number} [attempt] - 当前尝试次数
     * @returns {Promise<{content: string, usage: Object, model: string, id: string}>} API响应
     * @throws {ClaudeAPIError} 当所有重试都失败时抛出
     */
    async _retryableRequest(params, attempt = 1) {
        try {
            const retryInfo = attempt > 1 ? `(重试 ${attempt}/${this.maxRetries})` : '';
            Logger.info(`正在调用Claude API... ${retryInfo}`);

            // 调用API
            const response = await this.client.messages.create(params);

            // 返回标准化的响应格式
            return {
                content: response.content[0].text,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens
                },
                model: response.model,
                id: response.id
            };

        } catch (error) {
            // 处理不同类型的错误
            return this._handleError(error, params, attempt);
        }
    }

    /**
     * 处理API错误
     * @private
     * @param {Error} error - 原始错误
     * @param {Object} params - API参数
     * @param {number} attempt - 当前尝试次数
     * @returns {Promise<{content: string, usage: Object, model: string, id: string}>} API响应或重试
     * @throws {ClaudeAPIError} 当无法恢复时抛出
     */
    async _handleError(error, params, attempt) {
        // 处理429速率限制错误
        if (error.status === 429) {
            if (attempt < this.maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000; // 指数退避
                Logger.warning(`API速率限制，等待 ${waitTime / 1000} 秒后重试...`);
                await this._sleep(waitTime);
                return this._retryableRequest(params, attempt + 1);
            }
            throw new ClaudeAPIError(
                'API请求过于频繁，请稍后再试',
                'RATE_LIMIT',
                { originalError: error.message }
            );
        }

        // 处理401认证错误
        if (error.status === 401) {
            throw new ClaudeAPIError(
                'API密钥无效，请检查配置',
                'INVALID_API_KEY',
                { originalError: error.message }
            );
        }

        // 处理400请求错误
        if (error.status === 400) {
            throw new ClaudeAPIError(
                '请求参数错误',
                'INVALID_REQUEST',
                { originalError: error.message }
            );
        }

        // 处理网络错误
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            if (attempt < this.maxRetries) {
                Logger.warning('网络错误，2秒后重试...');
                await this._sleep(2000);
                return this._retryableRequest(params, attempt + 1);
            }
            throw new ClaudeAPIError(
                '网络连接失败，请检查网络',
                'NETWORK_ERROR',
                { originalError: error.message }
            );
        }

        // 处理未知错误
        throw new ClaudeAPIError(
            error.message || '未知API错误',
            'UNKNOWN_ERROR',
            { originalError: error.message, status: error.status }
        );
    }

    /**
     * 延迟函数（内部方法）
     * @private
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 更改使用的模型
     * @param {string} model - 新的模型名称
     */
    setModel(model) {
        this.model = model;
        Logger.info(`模型已切换为: ${model}`);
    }

    /**
     * 获取当前模型名称
     * @returns {string} 当前模型名称
     */
    getModel() {
        return this.model;
    }

    /**
     * 获取当前最大tokens配置
     * @returns {number} 最大tokens数
     */
    getMaxTokens() {
        return this.maxTokens;
    }

    /**
     * 设置最大tokens
     * @param {number} maxTokens - 新的最大tokens数
     */
    setMaxTokens(maxTokens) {
        this.maxTokens = maxTokens;
        Logger.info(`最大tokens已设置为: ${maxTokens}`);
    }
}
