// src/features/CodeExplainer.js
import { BaseFeature } from './BaseFeature.js';
import { Logger } from '../utils/logger.js';

/**
 * 代码解释功能模块
 * 帮助学习者理解代码的工作原理
 */
export class CodeExplainer extends BaseFeature {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    super({
      ...config,
      promptFile: config.promptFile || 'code-explainer.txt'
    });
    this.featureName = '代码解释';
  }

  /**
   * 执行代码解释功能
   * @param {Object} options - 执行选项
   * @param {string} options.code - 要解释的代码
   * @param {string} options.language - 编程语言（可选）
   * @param {string} options.question - 关于代码的特定问题（可选）
   * @returns {Promise<string>} Claude 的解释
   */
  async execute(options = {}) {
    await this.initialize();

    const { code, language, question } = options;

    if (!code) {
      throw new Error('请提供要解释的代码');
    }

    try {
      let message = '';

      // 构建消息
      if (language) {
        message += `编程语言: ${language}\n`;
      }

      if (question) {
        message += `问题: ${question}\n`;
      } else {
        message += '请解释以下代码:\n';
      }

      message += `\n\`\`\`\n${code}\n\`\`\``;

      Logger.info('发送代码到解释模块', {
        codeLength: code.length,
        language: language || '未指定'
      });

      const response = await this._sendMessage(message, {
        temperature: 0.3,
        maxTokens: 800
      });

      return {
        response: response.content,
        usage: response.usage
      };
    } catch (error) {
      Logger.error('代码解释执行失败', { error: error.message });
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
║                      代码解释助手                          ║
╚════════════════════════════════════════════════════════════╝

欢迎使用代码解释助手！我可以帮助您：

  • 解释代码的工作原理
  • 分析代码结构和逻辑
  • 识别代码模式和最佳实践
  • 指出潜在的问题和改进建议
  • 说明关键语法和概念

使用方法：
  1. 粘贴您想要解释的代码
  2. 可以指定编程语言（如 JavaScript、Python 等）
  3. 可以提出关于代码的特定问题
  4. 我会提供清晰、详细的代码解释

命令：
  /clear    - 清除对话历史
  /summary  - 查看会话摘要
  /export   - 导出对话记录
  /help     - 显示帮助信息
  /exit     - 退出代码解释

请粘贴您的代码，或使用 /help 查看更多帮助。
`;
  }

  /**
   * 获取帮助信息
   * @returns {string} 帮助信息文本
   */
  getHelpMessage() {
    return `
代码解释助手 - 帮助信息
═══════════════════════════════════════════════════════════

可用命令：

  基本命令：
    /help           显示此帮助信息
    /exit           退出代码解释

  对话管理：
    /clear          清除当前对话历史
    /summary        查看会话摘要统计

  导出功能：
    /export json    以 JSON 格式导出对话
    /export md      以 Markdown 格式导出对话
    /export text    以纯文本格式导出对话

使用技巧：

  1. 粘贴完整代码片段，包含必要的上下文
  2. 指定编程语言可以获得更准确的解释
  3. 可以针对代码的特定部分提问
  4. 支持多种编程语言（JavaScript、Python、Java等）

示例用法：

  • "解释这段 JavaScript 代码的功能"
  • "这段 Python 代码中的递归是如何工作的？"
  • "这个 React 组件使用了什么设计模式？"

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
   * 交互式代码解释循环
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
            outputCallback('\n感谢使用代码解释助手，再见！');
          } else if (result) {
            outputCallback(result);
          }
          continue;
        }

        // 处理代码输入
        outputCallback('\n正在分析代码...\n');

        const response = await this.execute({
          code: userInput
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
