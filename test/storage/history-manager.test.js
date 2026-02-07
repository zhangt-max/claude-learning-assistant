// test/storage/history-manager.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, unlinkSync } from 'fs';
import { HistoryManager } from '../../src/storage/HistoryManager.js';
import { join } from 'path';
import { tmpdir } from 'os';

describe('HistoryManager', () => {
    let historyManager;
    let testDataDir;

    beforeEach(async () => {
        // 创建临时测试目录
        testDataDir = join(tmpdir(), 'claude-test-' + Date.now());
        historyManager = new HistoryManager(testDataDir);
        await historyManager.initialize();
    });

    afterEach(() => {
        // 清理测试文件
        const historyFile = join(testDataDir, 'history.json');
        if (existsSync(historyFile)) {
            unlinkSync(historyFile);
        }
    });

    it('应该正确初始化', async () => {
        assert.ok(existsSync(testDataDir), '数据目录应该存在');
        assert.ok(existsSync(join(testDataDir, 'history.json')), '历史记录文件应该存在');
    });

    it('应该能够保存会话', async () => {
        const session = {
            mode: 'interactive-tutor',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            usage: {
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
                cost: 0.01
            },
            messageCount: 5
        };

        const sessionId = await historyManager.saveSession(session);
        assert.ok(sessionId, '应该返回会话ID');
        assert.ok(typeof sessionId === 'string', '会话ID应该是字符串');
    });

    it('应该能够获取会话列表', async () => {
        // 保存多个会话
        for (let i = 0; i < 5; i++) {
            await historyManager.saveSession({
                mode: 'test-mode',
                usage: {
                    inputTokens: i * 100,
                    outputTokens: i * 200,
                    totalTokens: i * 300,
                    cost: i * 0.01
                },
                messageCount: i
            });
        }

        const sessions = await historyManager.getSessions(10);
        assert.ok(Array.isArray(sessions), '返回值应该是数组');
        assert.strictEqual(sessions.length, 5, '应该返回5个会话');
    });

    it('应该能够限制返回的会话数量', async () => {
        // 保存多个会话
        for (let i = 0; i < 10; i++) {
            await historyManager.saveSession({
                mode: 'test-mode',
                usage: {
                    inputTokens: i * 100,
                    outputTokens: i * 200,
                    totalTokens: i * 300,
                    cost: i * 0.01
                },
                messageCount: i
            });
        }

        const sessions = await historyManager.getSessions(5);
        assert.strictEqual(sessions.length, 5, '应该只返回5个会话');
    });

    it('应该能够获取统计信息', async () => {
        await historyManager.saveSession({
            mode: 'mode-1',
            usage: {
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
                cost: 0.01
            },
            messageCount: 5
        });

        await historyManager.saveSession({
            mode: 'mode-2',
            usage: {
                inputTokens: 200,
                outputTokens: 400,
                totalTokens: 600,
                cost: 0.02
            },
            messageCount: 10
        });

        const stats = await historyManager.getStatistics();
        assert.strictEqual(stats.totalSessions, 2, '总话话数应该是2');
        assert.strictEqual(stats.totalCost, 0.03, '总成本应该是0.03');
        assert.strictEqual(stats.totalTokens, 900, '总Token数应该是900');
        assert.ok(stats.modeStats['mode-1'], '应该包含mode-1的统计');
        assert.ok(stats.modeStats['mode-2'], '应该包含mode-2的统计');
    });

    it('应该能够按模式过滤会话', async () => {
        await historyManager.saveSession({
            mode: 'mode-a',
            usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.01 },
            messageCount: 1
        });

        await historyManager.saveSession({
            mode: 'mode-b',
            usage: { inputTokens: 200, outputTokens: 400, totalTokens: 600, cost: 0.02 },
            messageCount: 2
        });

        await historyManager.saveSession({
            mode: 'mode-a',
            usage: { inputTokens: 300, outputTokens: 600, totalTokens: 900, cost: 0.03 },
            messageCount: 3
        });

        const modeASessions = await historyManager.getSessionsByMode('mode-a');
        assert.strictEqual(modeASessions.length, 2, '应该返回2个mode-a会话');

        const modeBSessions = await historyManager.getSessionsByMode('mode-b');
        assert.strictEqual(modeBSessions.length, 1, '应该返回1个mode-b会话');
    });

    it('应该能够清除所有历史记录', async () => {
        await historyManager.saveSession({
            mode: 'test',
            usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.01 },
            messageCount: 1
        });

        await historyManager.clearAll();

        const sessions = await historyManager.getSessions();
        assert.strictEqual(sessions.length, 0, '清除后应该没有会话');
    });

    it('应该能够导出为文本文件', async () => {
        await historyManager.saveSession({
            mode: 'test-mode',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            usage: {
                inputTokens: 100,
                outputTokens: 200,
                totalTokens: 300,
                cost: 0.01
            },
            messageCount: 5
        });

        const outputFile = join(testDataDir, 'export.txt');
        await historyManager.exportToText(outputFile);

        assert.ok(existsSync(outputFile), '导出文件应该存在');

        // 清理导出文件
        unlinkSync(outputFile);
    });

    it('空历史记录应该返回正确的统计', async () => {
        const stats = await historyManager.getStatistics();
        assert.strictEqual(stats.totalSessions, 0, '空历史记录的总会话数应该是0');
        assert.strictEqual(stats.totalCost, 0, '空历史记录的总成本应该是0');
        assert.strictEqual(stats.totalTokens, 0, '空历史记录的总Token数应该是0');
    });

    it('应该能够处理自定义会话ID', async () => {
        const customId = 'my-custom-session-id';
        const sessionId = await historyManager.saveSession({
            id: customId,
            mode: 'test',
            usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.01 },
            messageCount: 1
        });

        assert.strictEqual(sessionId, customId, '应该使用自定义ID');
    });
});
