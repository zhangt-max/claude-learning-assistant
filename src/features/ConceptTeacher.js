// src/features/ConceptTeacher.js
import { BaseFeature } from './BaseFeature.js';
import { Logger } from '../utils/logger.js';

/**
 * 概念讲解功能模块
 * 帮助学习者深入理解编程概念
 */
export class ConceptTeacher extends BaseFeature {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    super({
      ...config,
      promptFile: config.promptFile || 'concept-teacher.txt'
    });
    this.featureName = '概念讲解';
  }

  /**
   * 执行概念讲解功能
   * @param {Object} options - 执行选项
   * @param {string} options.concept - 要讲解的概念
   * @param {string} options.language - 编程语言或技术栈（可选）
   * @param {string} options.level - 讲解深度（基础/中级/高级，可选）
   * @returns {Promise<string>} Claude 的讲解
   */
  async execute(options = {}) {
    await this.initialize();

    const { concept, language, level } = options;

    if (!concept) {
      throw new Error('请提供要讲解的概念');
    }

    try {
      let message = '';

      // 构建消息
      if (language) {
        message += `技术栈: ${language}\n`;
      }

      if (level) {
        message += `深度: ${level}\n`;
      }

      message += `\n请讲解以下概念: ${concept}`;

      Logger.info('发送概念到讲解模块', {
        concept: concept,
        language: language || '未指定',
        level: level || '未指定'
      });

      const response = await this._sendMessage(message, {
        temperature: 0.5,
        maxTokens: 600
      });

      return {
        response: response.content,
        usage: response.usage
      };
    } catch (error) {
      Logger.error('概念讲解执行失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取欢迎消息
   * @returns {string} 欢迎消息文本
   */
  getWelcomeMessage() {
    return `
╔════════════════════════════════════════════════════════════╗
║                      概念讲解助手                          ║
╚════════════════════════════════════════════════════════════╝

欢迎使用概念讲解助手！我可以帮助您：

  • 深入理解编程核心概念
  • 提供生活化的类比说明
  • 展示实用的代码示例
  • 指出常见误区和注意事项
  • 根据您的水平调整讲解深度

使用方法：
  1. 输入您想要了解的概念名称
  2. 可以指定技术栈（如 JavaScript、React 等）
  3. 可以选择讲解深度（基础/中级/高级）
  4. 我会提供清晰、易懂的概念讲解

命令：
  /clear    - 清除对话历史
  /summary  - 查看会话摘要
  /export   - 导出对话记录
  /help     - 显示帮助信息
  /exit     - 退出概念讲解

请输入您想要了解的概念，或使用 /help 查看更多帮助。
`;
  }

  /**
   * 获取帮助信息
   * @returns {string} 帮助信息文本
   */
  getHelpMessage() {
    return `
概念讲解助手 - 帮助信息
═══════════════════════════════════════════════════════════

可用命令：

  基本命令：
    /help           显示此帮助信息
    /exit           退出概念讲解

  对话管理：
    /clear          清除当前对话历史
    /summary        查看会话摘要统计

  导出功能：
    /export json    以 JSON 格式导出对话
    /export md      以 Markdown 格式导出对话
    /export text    以纯文本格式导出对话

使用技巧：

  1. 使用准确的概念名称可以获得更好的效果
  2. 可以要求不同深度的讲解（基础/中级/高级）
  3. 可以结合具体技术栈进行讲解
  4. 支持追问和深入探讨

示例概念：

  • "闭包" (JavaScript)
  • "异步编程" (JavaScript/Python)
  • "虚拟DOM" (React)
  • "装饰器" (Python)
  • "泛型" (TypeScript/Java)

示例用法：

  • "讲解 JavaScript 中的闭包概念"
  • "React 的虚拟DOM是如何工作的？中级深度"
  • "解释 Python 的装饰器，基础讲解"

═══════════════════════════════════════════════════════════
`;
  }

  /**
   * 处理特殊命令
   * @param {string} command - 命令字符串
   * @returns {Promise<string|null>} 命令执行结果，null 表示不是特殊命令
   */
  async handleCommand(command) {
    const trimmedCommand = command.trim().toLowerCase();

    switch (trimmedCommand) {
      case '/help':
        return this.getHelpMessage();

      case '/clear':
        await this.clearConversation();
        return '对话历史已清除。';

      case '/summary':
        const summary = await this.getSessionSummary();
        return `
会话摘要
═══════════════════════════════════════════════════════════
功能模块: ${summary.feature}
消息数量: ${summary.messageCount}
对话轮数: ${summary.turnCount}
开始时间: ${summary.startTime ? new Date(summary.startTime).toLocaleString('zh-CN') : 'N/A'}
最后活动: ${summary.lastActivity ? new Date(summary.lastActivity).toLocaleString('zh-CN') : 'N/A'}
`;

      case '/exit':
        return 'EXIT_SIGNAL';

      default:
        if (trimmedCommand.startsWith('/export')) {
          const format = trimmedCommand.split(' ')[1] || 'markdown';
          const exported = await this.exportConversation(format);
          return `\n导出成功 (${format} 格式)：\n\n${exported}`;
        }
        return null;
    }
  }

  /**
   * 交互式概念讲解循环
   * @param {Function} inputCallback - 输入回调函数
   * @param {Function} outputCallback - 输出回调函数
   * @returns {Promise<void>}
   */
  async startInteractiveSession(inputCallback, outputCallback) {
    await this.initialize();

    // 显示欢迎消息
    outputCallback(this.getWelcomeMessage());

    let shouldExit = false;

    while (!shouldExit) {
      try {
        // 获取用户输入
        const userInput = await inputCallback();

        if (!userInput || userInput.trim() === '') {
          continue;
        }

        // 检查是否是命令
        if (userInput.startsWith('/')) {
          const result = await this.handleCommand(userInput);

          if (result === 'EXIT_SIGNAL') {
            shouldExit = true;
            outputCallback('\n感谢使用概念讲解助手，再见！');
          } else if (result) {
            outputCallback(result);
          }
          continue;
        }

        // 处理概念输入
        outputCallback('\n正在准备讲解...\n');

        const response = await this.execute({
          concept: userInput
        });

        outputCallback(`\n${response}\n`);

      } catch (error) {
        Logger.error('交互式会话错误', { error: error.message });
        outputCallback(`\n错误: ${error.message}\n`);
      }
    }

    // 清理资源
    await this.destroy();
  }
}
