// src/features/BaseFeature.js
import { ClaudeClient } from '../core/ClaudeClient.js';
import { ConversationManager } from '../core/ConversationManager.js';
import { Logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 功能模块基类
 * 所有功能模块的基础类，提供通用方法
 */
export class BaseFeature {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.promptFile - 提示词文件名（相对于prompts目录）
   * @param {string} config.conversationDir - 对话保存目录
   */
  constructor(config = {}) {
    this.config = config;
    this.promptFile = config.promptFile || null;
    this.conversationDir = config.conversationDir || path.join(process.cwd(), 'data', 'conversations');
    this.claudeClient = null;
    this.conversationManager = null;
    this.systemPrompt = null;
    this.isInitialized = false;
  }

  /**
   * 初始化功能模块
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      Logger.warn('功能模块已经初始化', { feature: this.constructor.name });
      return;
    }

    try {
      // 初始化 Claude 客户端
      this.claudeClient = new ClaudeClient({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
      });

      // 初始化对话管理器
      this.conversationManager = new ConversationManager({
        systemPrompt: ''
      });

      // 加载系统提示词
      if (this.promptFile) {
        await this._loadSystemPrompt();
        if (this.systemPrompt) {
          this.conversationManager.setSystemPrompt(this.systemPrompt);
        }
      }

      this.isInitialized = true;
      Logger.info('功能模块初始化成功', { feature: this.constructor.name });
    } catch (error) {
      Logger.error('功能模块初始化失败', { feature: this.constructor.name, error: error.message });
      throw error;
    }
  }


  /**
   * 执行功能（由子类实现）
   * @param {Object} options - 执行选项
   * @returns {Promise<any>}
   */
  async execute(options = {}) {
    throw new Error('execute 方法必须由子类实现');
  }

  /**
   * 加载系统提示词
   * @private
   * @returns {Promise<void>}
   */
  async _loadSystemPrompt() {
    try {
      const promptPath = path.join(process.cwd(), 'prompts', this.promptFile);
      this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
      Logger.info('系统提示词加载成功', { promptFile: this.promptFile });
    } catch (error) {
      Logger.warn('系统提示词加载失败，将使用默认配置', {
        promptFile: this.promptFile,
        error: error.message
      });
      this.systemPrompt = null;
    }
  }

  /**
   * 发送消息到 Claude
   * @protected
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} Claude 的响应对象 { content, usage }
   */
  async _sendMessage(message, options = {}) {
    if (!this.isInitialized) {
      throw new Error('功能模块未初始化，请先调用 initialize()');
    }

    try {
      // 添加用户消息到对话管理器
      this.conversationManager.addUserMessage(message);

      // 获取对话历史消息（不包含系统提示词）
      const messages = this.conversationManager.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 获取系统提示词
      const systemPrompt = this.conversationManager.getSystemPrompt();

      // 构建API调用选项，将系统提示词作为单独参数传递
      const apiOptions = {
        ...options,
        system: systemPrompt || undefined
      };

      // 发送到 Claude
      const response = await this.claudeClient.sendMessage(messages, apiOptions);

      // 添加助手响应到对话管理器
      this.conversationManager.addAssistantMessage(response.content);

      // 返回完整响应对象
      return {
        content: response.content,
        usage: response.usage
      };
    } catch (error) {
      Logger.error('发送消息失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 清除对话历史
   * @returns {Promise<void>}
   */
  async clearConversation() {
    if (!this.isInitialized) {
      throw new Error('功能模块未初始化，请先调用 initialize()');
    }

    try {
      await this.conversationManager.clear();
      Logger.info('对话历史已清除', { feature: this.constructor.name });
    } catch (error) {
      Logger.error('清除对话历史失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取会话摘要
   * @returns {Promise<Object>} 会话摘要对象
   */
  async getSessionSummary() {
    if (!this.isInitialized) {
      throw new Error('功能模块未初始化，请先调用 initialize()');
    }

    try {
      const history = this.conversationManager.getFullHistory();
      const summary = {
        feature: this.constructor.name,
        messageCount: history.length,
        turnCount: this.conversationManager.getTurnCount(),
        startTime: history.length > 0 ? history[0].timestamp : null,
        lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null
      };
      return summary;
    } catch (error) {
      Logger.error('获取会话摘要失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 导出对话
   * @param {string} format - 导出格式 ('json' | 'markdown' | 'text')
   * @returns {Promise<string>} 导出的对话内容
   */
  async exportConversation(format = 'markdown') {
    if (!this.isInitialized) {
      throw new Error('功能模块未初始化，请先调用 initialize()');
    }

    try {
      switch (format) {
        case 'json':
          const history = this.conversationManager.getFullHistory();
          return JSON.stringify(history, null, 2);

        case 'markdown':
          let md = `# ${this.constructor.name} 对话记录\n\n`;
          md += `**导出时间**: ${new Date().toISOString()}\n`;
          md += `**消息数量**: ${this.conversationManager.getFullHistory().length}\n\n`;
          md += '---\n\n';
          md += this.conversationManager.exportToText();
          return md;

        case 'text':
          let text = `${this.constructor.name} 对话记录\n`;
          text += `${'='.repeat(50)}\n\n`;
          text += this.conversationManager.exportToText();
          return text;

        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }
    } catch (error) {
      Logger.error('导出对话失败', { format, error: error.message });
      throw error;
    }
  }

  /**
   * 销毁功能模块，释放资源
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.conversationManager?.clear();
      this.isInitialized = false;
      Logger.info('功能模块已销毁', { feature: this.constructor.name });
    } catch (error) {
      Logger.error('销毁功能模块失败', { error: error.message });
      throw error;
    }
  }
}
