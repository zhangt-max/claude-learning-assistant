// src/features/CodeGenerator.js
import { BaseFeature } from './BaseFeature.js';
import { Logger } from '../utils/logger.js';

/**
 * 代码生成功能模块
 * 根据需求生成清晰、可维护的代码
 */
export class CodeGenerator extends BaseFeature {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config = {}) {
    super({
      ...config,
      promptFile: config.promptFile || 'code-generator.txt'
    });
    this.featureName = '代码生成';
  }

  /**
   * 执行代码生成功能
   * @param {Object} options - 执行选项
   * @param {string} options.requirement - 代码需求描述
   * @param {string} options.language - 编程语言（可选）
   * @param {string} options.framework - 框架或库（可选）
   * @returns {Promise<string>} Claude 生成的代码
   */
  async execute(options = {}) {
    await this.initialize();

    const { requirement, language, framework } = options;

    if (!requirement) {
      throw new Error('请提供代码需求描述');
    }

    try {
      let message = '';

      // 构建消息
      if (language) {
        message += `编程语言: ${language}\n`;
      }

      if (framework) {
        message += `框架/库: ${framework}\n`;
      }

      message += `\n需求: ${requirement}`;

      Logger.info('发送需求到代码生成模块', {
        requirement: requirement.substring(0, 50),
        language: language || '未指定',
        framework: framework || '未指定'
      });

      const response = await this._sendMessage(message, {
        temperature: 0.2,
        maxTokens: 1000
      });

      return {
        response: response.content,
        usage: response.usage
      };
    } catch (error) {
      Logger.error('代码生成执行失败', { error: error.message });
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
║                      代码生成助手                          ║
╚════════════════════════════════════════════════════════════╝

欢迎使用代码生成助手！我可以帮助您：

  • 根据需求生成符合最佳实践的代码
  • 提供带有注释的清晰代码
  • 包含使用示例和说明
  • 考虑边界情况和错误处理
  • 针对特定框架或库生成代码

使用方法：
  1. 描述您的代码需求
  2. 可以指定编程语言（如 JavaScript、Python 等）
  3. 可以指定框架或库（如 React、Express 等）
  4. 我会生成完整、可用的代码

命令：
  /clear    - 清除对话历史
  /summary  - 查看会话摘要
  /export   - 导出对话记录
  /help     - 显示帮助信息
  /exit     - 退出代码生成

请描述您的代码需求，或使用 /help 查看更多帮助。
`;
  }

  /**
   * 获取帮助信息
   * @returns {string} 帮助信息文本
   */
  getHelpMessage() {
    return `
代码生成助手 - 帮助信息
═══════════════════════════════════════════════════════════

可用命令：

  基本命令：
    /help           显示此帮助信息
    /exit           退出代码生成

  对话管理：
    /clear          清除当前对话历史
    /summary        查看会话摘要统计

  导出功能：
    /export json    以 JSON 格式导出对话
    /export md      以 Markdown 格式导出对话
    /export text    以纯文本格式导出对话

使用技巧：

  1. 尽量详细地描述代码需求
  2. 指定编程语言和框架可以获得更好的结果
  3. 可以要求特定功能或特性
  4. 如果需求不明确，我会先询问澄清
  5. 支持迭代优化和修改生成的代码

示例需求：

  • "创建一个 React 登录表单组件"
  • "生成一个 Python 函数来解析 JSON 文件"
  • "写一个 Node.js 的 Express 路由处理用户注册"

示例用法：

  • "生成一个 React 待办事项列表组件，支持添加和删除"
  • "创建一个 Python 类来管理数据库连接"
  • "写一个 JavaScript 函数来验证邮箱格式"

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
   * 交互式代码生成循环
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
            outputCallback('\n感谢使用代码生成助手，再见！');
          } else if (result) {
            outputCallback(result);
          }
          continue;
        }

        // 处理代码生成请求
        outputCallback('\n正在生成代码...\n');

        const response = await this.execute({
          requirement: userInput
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
