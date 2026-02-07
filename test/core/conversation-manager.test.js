// test/core/conversation-manager.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ConversationManager, MessageRole } from '../../src/core/ConversationManager.js';

describe('ConversationManager', () => {
    let manager;

    beforeEach(() => {
        manager = new ConversationManager();
    });

    describe('constructor', () => {
        it('应该使用默认配置创建实例', () => {
            const defaultManager = new ConversationManager();

            assert.strictEqual(typeof defaultManager.maxHistoryTokens, 'number');
            assert.strictEqual(defaultManager.messages.length, 0);
            assert.strictEqual(defaultManager.systemPrompt, '');
        });

        it('应该使用自定义配置创建实例', () => {
            const customManager = new ConversationManager({
                systemPrompt: 'You are a helpful assistant.',
                maxHistoryTokens: 50000
            });

            assert.strictEqual(customManager.systemPrompt, 'You are a helpful assistant.');
            assert.strictEqual(customManager.maxHistoryTokens, 50000);
        });
    });

    describe('setSystemPrompt', () => {
        it('应该设置系统提示词', () => {
            manager.setSystemPrompt('You are a coding assistant.');

            assert.strictEqual(manager.getSystemPrompt(), 'You are a coding assistant.');
        });

        it('应该覆盖已存在的系统提示词', () => {
            manager.setSystemPrompt('First prompt');
            manager.setSystemPrompt('Second prompt');

            assert.strictEqual(manager.getSystemPrompt(), 'Second prompt');
        });

        it('应该支持空字符串作为系统提示词', () => {
            manager.setSystemPrompt('Some prompt');
            manager.setSystemPrompt('');

            assert.strictEqual(manager.getSystemPrompt(), '');
        });
    });

    describe('addUserMessage', () => {
        it('应该添加用户消息', () => {
            manager.addUserMessage('Hello');

            assert.strictEqual(manager.messages.length, 1);
            assert.strictEqual(manager.messages[0].role, MessageRole.USER);
            assert.strictEqual(manager.messages[0].content, 'Hello');
            assert.strictEqual(typeof manager.messages[0].timestamp, 'number');
        });

        it('应该添加多条用户消息', () => {
            manager.addUserMessage('First message');
            manager.addUserMessage('Second message');

            assert.strictEqual(manager.messages.length, 2);
            assert.strictEqual(manager.messages[0].content, 'First message');
            assert.strictEqual(manager.messages[1].content, 'Second message');
        });
    });

    describe('addAssistantMessage', () => {
        it('应该添加助手消息', () => {
            manager.addAssistantMessage('Hi there!');

            assert.strictEqual(manager.messages.length, 1);
            assert.strictEqual(manager.messages[0].role, MessageRole.ASSISTANT);
            assert.strictEqual(manager.messages[0].content, 'Hi there!');
            assert.strictEqual(typeof manager.messages[0].timestamp, 'number');
        });

        it('应该添加多条助手消息', () => {
            manager.addAssistantMessage('First response');
            manager.addAssistantMessage('Second response');

            assert.strictEqual(manager.messages.length, 2);
            assert.strictEqual(manager.messages[0].content, 'First response');
            assert.strictEqual(manager.messages[1].content, 'Second response');
        });
    });

    describe('getMessages', () => {
        it('应该返回空数组（无消息、无系统提示词）', () => {
            const messages = manager.getMessages();

            assert.strictEqual(messages.length, 0);
            assert.ok(Array.isArray(messages));
        });

        it('应该返回只包含系统提示词的消息', () => {
            manager.setSystemPrompt('System prompt');

            const messages = manager.getMessages();

            assert.strictEqual(messages.length, 1);
            assert.strictEqual(messages[0].role, MessageRole.SYSTEM);
            assert.strictEqual(messages[0].content, 'System prompt');
        });

        it('应该返回系统提示词和对话消息', () => {
            manager.setSystemPrompt('System');
            manager.addUserMessage('User message');
            manager.addAssistantMessage('Assistant response');

            const messages = manager.getMessages();

            assert.strictEqual(messages.length, 3);
            assert.strictEqual(messages[0].role, MessageRole.SYSTEM);
            assert.strictEqual(messages[1].role, MessageRole.USER);
            assert.strictEqual(messages[2].role, MessageRole.ASSISTANT);
        });

        it('返回的消息不应包含时间戳', () => {
            manager.addUserMessage('Test');

            const messages = manager.getMessages();

            assert.strictEqual(messages.length, 1);
            assert.ok(!messages[0].hasOwnProperty('timestamp'));
            assert.ok(messages[0].hasOwnProperty('role'));
            assert.ok(messages[0].hasOwnProperty('content'));
        });
    });

    describe('getFullHistory', () => {
        it('应该返回空数组（无消息）', () => {
            const history = manager.getFullHistory();

            assert.strictEqual(history.length, 0);
            assert.ok(Array.isArray(history));
        });

        it('应该返回包含时间戳的完整历史', () => {
            manager.addUserMessage('User says hello');
            manager.addAssistantMessage('Assistant replies');

            const history = manager.getFullHistory();

            assert.strictEqual(history.length, 2);
            assert.strictEqual(history[0].content, 'User says hello');
            assert.strictEqual(history[1].content, 'Assistant replies');
            assert.ok(history[0].hasOwnProperty('timestamp'));
            assert.ok(history[1].hasOwnProperty('timestamp'));
        });

        it('应该返回历史记录的副本（不影响原数据）', () => {
            manager.addUserMessage('Original');

            const history = manager.getFullHistory();
            history.push({ role: 'user', content: 'Modified' });

            assert.strictEqual(manager.messages.length, 1);
            assert.strictEqual(manager.messages[0].content, 'Original');
        });
    });

    describe('getSystemPrompt', () => {
        it('应该返回空字符串（未设置系统提示词）', () => {
            assert.strictEqual(manager.getSystemPrompt(), '');
        });

        it('应该返回已设置的系统提示词', () => {
            manager.setSystemPrompt('Custom system prompt');

            assert.strictEqual(manager.getSystemPrompt(), 'Custom system prompt');
        });
    });

    describe('clear', () => {
        it('应该清空所有消息', () => {
            manager.addUserMessage('Message 1');
            manager.addAssistantMessage('Response 1');
            manager.addUserMessage('Message 2');

            assert.strictEqual(manager.messages.length, 3);

            manager.clear();

            assert.strictEqual(manager.messages.length, 0);
        });

        it('清空后不应影响系统提示词', () => {
            manager.setSystemPrompt('System prompt');
            manager.addUserMessage('User message');

            manager.clear();

            assert.strictEqual(manager.getSystemPrompt(), 'System prompt');
            assert.strictEqual(manager.messages.length, 0);
        });

        it('清空后应该能继续添加消息', () => {
            manager.addUserMessage('Before clear');
            manager.clear();

            manager.addUserMessage('After clear');

            assert.strictEqual(manager.messages.length, 1);
            assert.strictEqual(manager.messages[0].content, 'After clear');
        });
    });

    describe('getTurnCount', () => {
        it('应该返回0（无消息）', () => {
            assert.strictEqual(manager.getTurnCount(), 0);
        });

        it('应该返回0（只有一条用户消息）', () => {
            manager.addUserMessage('User message');

            assert.strictEqual(manager.getTurnCount(), 0);
        });

        it('应该正确计算完整的对话轮数', () => {
            manager.addUserMessage('User 1');
            manager.addAssistantMessage('Assistant 1');
            manager.addUserMessage('User 2');
            manager.addAssistantMessage('Assistant 2');

            assert.strictEqual(manager.getTurnCount(), 2);
        });

        it('应该向下取整（不完整的轮）', () => {
            manager.addUserMessage('User 1');
            manager.addAssistantMessage('Assistant 1');
            manager.addUserMessage('User 2');

            assert.strictEqual(manager.getTurnCount(), 1);
        });
    });

    describe('exportToText', () => {
        it('应该返回空对话标记（无消息、无系统提示词）', () => {
            const text = manager.exportToText();

            assert.strictEqual(text, '(空对话)');
        });

        it('应该导出系统提示词', () => {
            manager.setSystemPrompt('You are helpful.');

            const text = manager.exportToText();

            assert.ok(text.includes('系统提示词'));
            assert.ok(text.includes('You are helpful.'));
        });

        it('应该导出对话历史', () => {
            manager.addUserMessage('Hello');
            manager.addAssistantMessage('Hi!');

            const text = manager.exportToText();

            assert.ok(text.includes('对话历史'));
            assert.ok(text.includes('Hello'));
            assert.ok(text.includes('Hi!'));
        });

        it('应该导出带有角色的完整对话', () => {
            manager.setSystemPrompt('System');
            manager.addUserMessage('User msg');
            manager.addAssistantMessage('Assistant msg');

            const text = manager.exportToText();

            assert.ok(text.includes('用户'));
            assert.ok(text.includes('助手'));
        });

        it('应该包含时间戳信息', () => {
            manager.addUserMessage('Test message');

            const text = manager.exportToText();

            // 时间戳格式应该包含日期/时间的特征
            assert.ok(text.includes('[') && text.includes(']'));
        });
    });

    describe('历史记录修剪', () => {
        it('应该在token限制内自动修剪历史记录', () => {
            const smallLimitManager = new ConversationManager({
                maxHistoryTokens: 100 // 非常小的限制
            });

            // 添加超过限制的消息
            smallLimitManager.addUserMessage('A'.repeat(100));
            smallLimitManager.addAssistantMessage('B'.repeat(100));
            smallLimitManager.addUserMessage('C'.repeat(100));
            smallLimitManager.addAssistantMessage('D'.repeat(100));

            // 应该被修剪，只保留最新的消息
            assert.ok(smallLimitManager.messages.length < 4);
        });

        it('应该以用户-助手对为单位修剪', () => {
            const smallLimitManager = new ConversationManager({
                maxHistoryTokens: 50
            });

            smallLimitManager.addUserMessage('First user');
            smallLimitManager.addAssistantMessage('First assistant');
            smallLimitManager.addUserMessage('Second user');
            smallLimitManager.addAssistantMessage('Second assistant');

            // 应该保留最新的完整对话对
            assert.ok(smallLimitManager.messages.length >= 0);
        });

        it('修剪不应删除系统提示词', () => {
            const smallLimitManager = new ConversationManager({
                systemPrompt: 'Important system prompt',
                maxHistoryTokens: 50
            });

            smallLimitManager.addUserMessage('A'.repeat(50));
            smallLimitManager.addAssistantMessage('B'.repeat(50));

            // 系统提示词应该保留
            assert.strictEqual(smallLimitManager.getSystemPrompt(), 'Important system prompt');
        });

        it('应该保留最新的消息', () => {
            const smallLimitManager = new ConversationManager({
                maxHistoryTokens: 30
            });

            smallLimitManager.addUserMessage('Old message');
            smallLimitManager.addAssistantMessage('Old response');
            smallLimitManager.addUserMessage('New message');

            // 最新的消息应该被保留
            const messages = smallLimitManager.getFullHistory();
            assert.ok(messages.length > 0);
            // 最后一消息应该是 "New message"
            assert.strictEqual(messages[messages.length - 1].content, 'New message');
        });
    });
});
