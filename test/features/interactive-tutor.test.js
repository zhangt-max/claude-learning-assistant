// test/features/interactive-tutor.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { InteractiveTutor } from '../../src/features/InteractiveTutor.js';

/**
 * 互动问答功能模块测试
 */
describe('互动问答功能模块测试', () => {
  let tutor;

  beforeEach(() => {
    // 创建测试实例
    tutor = new InteractiveTutor({
      promptFile: 'tutor.txt'
    });
  });

  afterEach(async () => {
    // 清理
    if (tutor && tutor.isInitialized) {
      await tutor.destroy();
    }
  });

  describe('构造函数测试', () => {
    it('应该正确创建 InteractiveTutor 实例', () => {
      assert.ok(tutor instanceof InteractiveTutor);
      assert.strictEqual(tutor.featureName, '互动问答');
      assert.strictEqual(tutor.promptFile, 'tutor.txt');
    });

    it('应该支持自定义配置', () => {
      const customTutor = new InteractiveTutor({
        promptFile: 'custom-tutor.txt'
      });
      assert.strictEqual(customTutor.promptFile, 'custom-tutor.txt');
    });
  });

  describe('欢迎消息测试', () => {
    it('应该返回欢迎消息', () => {
      const welcomeMessage = tutor.getWelcomeMessage();

      assert.ok(typeof welcomeMessage === 'string');
      assert.ok(welcomeMessage.length > 0);
      assert.ok(welcomeMessage.includes('互动问答助手'));
      assert.ok(welcomeMessage.includes('/help'));
      assert.ok(welcomeMessage.includes('/exit'));
    });

    it('欢迎消息应该包含使用说明', () => {
      const welcomeMessage = tutor.getWelcomeMessage();

      assert.ok(welcomeMessage.includes('使用方法'));
      assert.ok(welcomeMessage.includes('命令'));
    });
  });

  describe('帮助消息测试', () => {
    it('应该返回帮助信息', () => {
      const helpMessage = tutor.getHelpMessage();

      assert.ok(typeof helpMessage === 'string');
      assert.ok(helpMessage.length > 0);
      assert.ok(helpMessage.includes('可用命令'));
      assert.ok(helpMessage.includes('/clear'));
      assert.ok(helpMessage.includes('/summary'));
      assert.ok(helpMessage.includes('/export'));
    });

    it('帮助消息应该包含示例', () => {
      const helpMessage = tutor.getHelpMessage();

      assert.ok(helpMessage.includes('示例问题'));
      assert.ok(helpMessage.includes('使用技巧'));
    });
  });

  describe('命令处理测试', () => {
    it('应该处理 /help 命令', async () => {
      const result = await tutor.handleCommand('/help');

      assert.ok(result !== null);
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('帮助信息'));
    });

    it('应该处理 /clear 命令', async () => {
      await tutor.initialize();
      const result = await tutor.handleCommand('/clear');

      assert.ok(result !== null);
      assert.ok(result.includes('对话历史已清除'));
    });

    it('应该处理 /export 命令', async () => {
      await tutor.initialize();
      const result = await tutor.handleCommand('/export text');

      assert.ok(result !== null);
      assert.ok(result.includes('导出成功'));
    });

    it('应该返回 EXIT_SIGNAL 处理 /exit 命令', async () => {
      const result = await tutor.handleCommand('/exit');

      assert.strictEqual(result, 'EXIT_SIGNAL');
    });

    it('应该对非命令返回 null', async () => {
      const result = await tutor.handleCommand('这是一个普通问题');

      assert.strictEqual(result, null);
    });
  });

  describe('execute 方法测试', () => {
    it('未初始化时调用 execute 应该抛出错误', async () => {
      await assert.rejects(
        async () => {
          await tutor.execute({ question: '测试问题' });
        },
        (error) => {
          assert.ok(error.message.includes('未初始化'));
          return true;
        }
      );
    });

    it('缺少问题参数时应该抛出错误', async () => {
      await tutor.initialize();

      await assert.rejects(
        async () => {
          await tutor.execute({});
        },
        (error) => {
          assert.ok(error.message.includes('请提供问题内容'));
          return true;
        }
      );
    });

    it('应该正确构建带上下文的消息', async () => {
      await tutor.initialize();

      // 模拟 _sendMessage 方法
      let capturedMessage = null;
      tutor._sendMessage = async (message) => {
        capturedMessage = message;
        return '模拟响应';
      };

      await tutor.execute({
        question: '什么是闭包？',
        context: 'JavaScript 编程'
      });

      assert.ok(capturedMessage.includes('什么是闭包？'));
      assert.ok(capturedMessage.includes('JavaScript 编程'));
    });
  });

  describe('会话管理测试', () => {
    it('应该正确清除对话历史', async () => {
      await tutor.initialize();

      // 模拟添加一些消息
      tutor.conversationManager.addUserMessage('测试消息1');
      tutor.conversationManager.addAssistantMessage('测试响应1');

      let historyBefore = tutor.conversationManager.getFullHistory();
      assert.ok(historyBefore.length > 0);

      await tutor.clearConversation();

      let historyAfter = tutor.conversationManager.getFullHistory();
      assert.strictEqual(historyAfter.length, 0);
    });

    it('应该正确获取会话摘要', async () => {
      await tutor.initialize();

      // 添加一些测试消息
      tutor.conversationManager.addUserMessage('测试消息');
      tutor.conversationManager.addAssistantMessage('测试响应');

      const summary = await tutor.getSessionSummary();

      assert.ok(typeof summary === 'object');
      assert.strictEqual(summary.feature, 'InteractiveTutor');
      assert.ok(summary.messageCount >= 0);
      assert.ok(typeof summary.turnCount === 'number');
    });

    it('应该正确导出对话', async () => {
      await tutor.initialize();

      // 添加测试消息
      tutor.conversationManager.addUserMessage('测试消息');
      tutor.conversationManager.addAssistantMessage('测试响应');

      const exported = await tutor.exportConversation('text');

      assert.ok(typeof exported === 'string');
      assert.ok(exported.length > 0);
      assert.ok(exported.includes('InteractiveTutor'));
    });

    it('应该支持多种导出格式', async () => {
      await tutor.initialize();

      const formats = ['json', 'markdown', 'text'];

      for (const format of formats) {
        const exported = await tutor.exportConversation(format);
        assert.ok(typeof exported === 'string');
        assert.ok(exported.length > 0);
      }
    });

    it('不支持的导出格式应该抛出错误', async () => {
      await tutor.initialize();

      await assert.rejects(
        async () => {
          await tutor.exportConversation('invalid_format');
        },
        (error) => {
          assert.ok(error.message.includes('不支持的导出格式'));
          return true;
        }
      );
    });
  });

  describe('资源清理测试', () => {
    it('应该正确销毁实例', async () => {
      await tutor.initialize();

      assert.strictEqual(tutor.isInitialized, true);

      await tutor.destroy();

      assert.strictEqual(tutor.isInitialized, false);
    });
  });

  describe('继承测试', () => {
    it('应该正确继承 BaseFeature', () => {
      assert.ok(tutor instanceof Object);
      assert.ok(typeof tutor.initialize === 'function');
      assert.ok(typeof tutor.execute === 'function');
      assert.ok(typeof tutor._sendMessage === 'function');
      assert.ok(typeof tutor.clearConversation === 'function');
      assert.ok(typeof tutor.getSessionSummary === 'function');
      assert.ok(typeof tutor.exportConversation === 'function');
      assert.ok(typeof tutor.destroy === 'function');
    });
  });
});
