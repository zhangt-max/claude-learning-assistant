// src/features/InteractiveTutor.js
import { BaseFeature } from './BaseFeature.js';
import { Logger } from '../utils/logger.js';

/**
 * 互动问答功能模块
 * 提供交互式学习和问答功能
 */
export class InteractiveTutor extends BaseFeature {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    super({
      ...config,
      promptFile: config.promptFile || 'tutor.txt'
    });
    this.featureName = '互动问答';
  }

  /**
   * 执行互动问答功能
   * @param {Object} options - 执行选项
   * @param {string} options.question - 用户问题
   * @param {string} options.context - 上下文信息（可选）
   * @returns {Promise<string>} Claude 的回答
   */
  async execute(options = {}) {
    await this.initialize();

    const { question, context } = options;

    if (!question) {
      throw new Error('请提供问题内容');
    }

    try {
      let message = question;

      // 如果有上下文，将其附加到问题中
      if (context) {
        message = `上下文：${context}\n\n问题：${question}`;
      }

      Logger.info('发送问题到互动问答模块', { question: question.substring(0, 50) });

      const response = await this._sendMessage(message, options);

      // 返回完整结果对象
      return {
        response: response.content,
        usage: response.usage
      };
    } catch (error) {
      Logger.error('互动问答执行失败', { error: error.message });
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
║                      互动问答助手                          ║
╚════════════════════════════════════════════════════════════╝

欢迎使用互动问答助手！我可以帮助您：

  • 解答编程和技术问题
  • 解释复杂的概念
  • 提供学习建议和指导
  • 进行代码审查和优化建议
  • 讨论最佳实践和设计模式

使用方法：
  1. 直接输入您的问题
  2. 可以提供代码或上下文信息
  3. 我会根据您的需求提供详细的回答

命令：
  /clear    - 清除对话历史
  /summary  - 查看会话摘要
  /export   - 导出对话记录
  /help     - 显示帮助信息
  /exit     - 退出互动问答

请输入您的问题，或使用 /help 查看更多帮助。
`;
  }

  /**
   * 获取帮助信息
   * @returns {string} 帮助信息文本
   */
  getHelpMessage() {
    return `
互动问答助手 - 帮助信息
═══════════════════════════════════════════════════════════

可用命令：

  基本命令：
    /help           显示此帮助信息
    /exit           退出互动问答

  对话管理：
    /clear          清除当前对话历史
    /summary        查看会话摘要统计

  导出功能：
    /export json    以 JSON 格式导出对话
    /export md      以 Markdown 格式导出对话
    /export text    以纯文本格式导出对话

使用技巧：

  1. 提问时尽量详细，包含上下文信息
  2. 可以粘贴代码片段进行分析
  3. 使用特定术语可以获得更准确的答案
  4. 可以连续提问，我会记住对话上下文

示例问题：

  • "解释 JavaScript 中的闭包概念"
  • "这段代码有什么问题？[粘贴代码]"
  • "如何优化 React 组件性能？"
  • "Python 的装饰器是如何工作的？"

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
   * 交互式问答循环
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
            outputCallback('\n感谢使用互动问答助手，再见！');
          } else if (result) {
            outputCallback(result);
          }
          continue;
        }

        // 处理普通问题
        outputCallback('\n正在思考...\n');

        const response = await this.execute({
          question: userInput
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
