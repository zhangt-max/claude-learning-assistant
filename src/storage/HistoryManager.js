// src/storage/HistoryManager.js
import fs from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 生成UUID v4
 * @returns {string} UUID字符串
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 历史记录管理器
 * 用于保存和管理用户会话历史
 */
export class HistoryManager {
    /**
     * @param {string} [dataDir] - 数据目录路径，默认为项目根目录下的data文件夹
     */
    constructor(dataDir = null) {
        // 默认使用项目根目录下的data文件夹
        this.dataDir = dataDir || join(dirname(__dirname), '..', 'data');
        this.historyFile = join(this.dataDir, 'history.json');
        Logger.info(`历史记录管理器初始化，数据目录: ${this.dataDir}`);
    }

    /**
     * 初始化历史记录管理器
     * 确保目录和文件存在
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // 确保目录存在
            if (!existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
                Logger.info(`创建数据目录: ${this.dataDir}`);
            }

            // 确保文件存在
            if (!existsSync(this.historyFile)) {
                fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2), 'utf-8');
                Logger.info(`创建历史记录文件: ${this.historyFile}`);
            }

            Logger.info('历史记录管理器初始化完成');
        } catch (error) {
            Logger.error('历史记录管理器初始化失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 保存会话到历史记录
     * @param {Object} session - 会话对象
     * @param {string} [session.id] - 会话ID，如果不提供则自动生成
     * @param {string} session.mode - 功能模式
     * @param {Date} [session.startTime] - 开始时间
     * @param {Date} [session.endTime] - 结束时间
     * @param {Object} session.usage - Token使用情况
     * @param {number} session.usage.inputTokens - 输入tokens
     * @param {number} session.usage.outputTokens - 输出tokens
     * @param {number} session.usage.totalTokens - 总tokens
     * @param {number} session.usage.cost - 成本
     * @param {number} [session.messageCount] - 消息数量
     * @returns {Promise<string>} 会话ID
     */
    async saveSession(session) {
        try {
            // 读取现有历史记录
            const history = await this._readHistory();

            // 生成会话ID
            const sessionId = session.id || generateUUID();

            // 创建会话记录
            const sessionRecord = {
                id: sessionId,
                mode: session.mode,
                startTime: session.startTime || new Date().toISOString(),
                endTime: session.endTime || new Date().toISOString(),
                usage: session.usage,
                messageCount: session.messageCount || 0,
                createdAt: new Date().toISOString()
            };

            // 添加到历史记录
            history.push(sessionRecord);

            // 写入文件
            await this._writeHistory(history);

            Logger.info(`会话已保存`, { sessionId, mode: session.mode });
            return sessionId;
        } catch (error) {
            Logger.error('保存会话失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 获取最近的历史记录
     * @param {number} [limit=10] - 返回记录数量限制
     * @returns {Promise<Array>} 会话记录数组
     */
    async getSessions(limit = 10) {
        try {
            const history = await this._readHistory();
            // 按时间倒序排序，返回最近的记录
            return history
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        } catch (error) {
            Logger.error('获取历史记录失败', { error: error.message });
            return [];
        }
    }

    /**
     * 获取使用统计信息
     * @returns {Promise<Object>} 统计信息对象
     */
    async getStatistics() {
        try {
            const history = await this._readHistory();

            if (history.length === 0) {
                return {
                    totalSessions: 0,
                    totalCost: 0,
                    totalTokens: 0,
                    averageCostPerSession: 0,
                    modeStats: {}
                };
            }

            // 计算总体统计
            const totalCost = history.reduce((sum, session) => sum + (session.usage?.cost || 0), 0);
            const totalTokens = history.reduce((sum, session) => sum + (session.usage?.totalTokens || 0), 0);
            const averageCostPerSession = totalCost / history.length;

            // 按模式统计
            const modeStats = {};
            history.forEach(session => {
                const mode = session.mode || 'unknown';
                if (!modeStats[mode]) {
                    modeStats[mode] = {
                        count: 0,
                        totalCost: 0,
                        totalTokens: 0
                    };
                }
                modeStats[mode].count++;
                modeStats[mode].totalCost += session.usage?.cost || 0;
                modeStats[mode].totalTokens += session.usage?.totalTokens || 0;
            });

            return {
                totalSessions: history.length,
                totalCost,
                totalTokens,
                averageCostPerSession,
                modeStats
            };
        } catch (error) {
            Logger.error('获取统计信息失败', { error: error.message });
            return {
                totalSessions: 0,
                totalCost: 0,
                totalTokens: 0,
                averageCostPerSession: 0,
                modeStats: {}
            };
        }
    }

    /**
     * 按模式获取历史记录
     * @param {string} mode - 功能模式
     * @returns {Promise<Array>} 会话记录数组
     */
    async getSessionsByMode(mode) {
        try {
            const history = await this._readHistory();
            return history.filter(session => session.mode === mode);
        } catch (error) {
            Logger.error('按模式获取历史记录失败', { error: error.message, mode });
            return [];
        }
    }

    /**
     * 清除所有历史记录
     * @returns {Promise<void>}
     */
    async clearAll() {
        try {
            await this._writeHistory([]);
            Logger.info('所有历史记录已清除');
        } catch (error) {
            Logger.error('清除历史记录失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 导出历史记录到文本文件
     * @param {string} outputFile - 输出文件路径
     * @returns {Promise<void>}
     */
    async exportToText(outputFile) {
        try {
            const history = await this._readHistory();
            const stats = await this.getStatistics();

            let content = '';
            content += '═══════════════════════════════════════════════════════════\n';
            content += '                      Claude 学习助手历史记录\n';
            content += '═══════════════════════════════════════════════════════════\n\n';

            // 添加统计信息
            content += '📊 总体统计\n';
            content += '───────────────────────────────────────────────────────────\n';
            content += `总会话数: ${stats.totalSessions}\n`;
            content += `总成本: $${stats.totalCost.toFixed(6)}\n`;
            content += `总Token数: ${stats.totalTokens.toLocaleString()}\n`;
            content += `平均每会话成本: $${stats.averageCostPerSession.toFixed(6)}\n\n`;

            // 按模式统计
            if (Object.keys(stats.modeStats).length > 0) {
                content += '📈 按模式统计\n';
                content += '───────────────────────────────────────────────────────────\n';
                Object.entries(stats.modeStats).forEach(([mode, data]) => {
                    content += `${mode}:\n`;
                    content += `  会话数: ${data.count}\n`;
                    content += `  总成本: $${data.totalCost.toFixed(6)}\n`;
                    content += `  总Token数: ${data.totalTokens.toLocaleString()}\n\n`;
                });
            }

            // 添加详细会话记录
            content += '📝 会话详情\n';
            content += '═══════════════════════════════════════════════════════════\n\n';

            const sortedHistory = history.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            sortedHistory.forEach((session, index) => {
                content += `会话 #${index + 1}\n`;
                content += '───────────────────────────────────────────────────────────\n';
                content += `ID: ${session.id}\n`;
                content += `模式: ${session.mode}\n`;
                content += `开始时间: ${new Date(session.startTime).toLocaleString('zh-CN')}\n`;
                content += `结束时间: ${new Date(session.endTime).toLocaleString('zh-CN')}\n`;
                content += `消息数: ${session.messageCount}\n`;
                content += `Token使用:\n`;
                content += `  输入: ${(session.usage?.inputTokens || 0).toLocaleString()}\n`;
                content += `  输出: ${(session.usage?.outputTokens || 0).toLocaleString()}\n`;
                content += `  总计: ${(session.usage?.totalTokens || 0).toLocaleString()}\n`;
                content += `成本: $${(session.usage?.cost || 0).toFixed(6)}\n`;
                content += '\n';
            });

            // 写入文件
            fs.writeFileSync(outputFile, content, 'utf-8');
            Logger.info(`历史记录已导出到: ${outputFile}`);
        } catch (error) {
            Logger.error('导出历史记录失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 读取历史记录（内部方法）
     * @private
     * @returns {Promise<Array>} 历史记录数组
     */
    async _readHistory() {
        try {
            const content = fs.readFileSync(this.historyFile, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * 写入历史记录（内部方法）
     * @private
     * @param {Array} history - 历史记录数组
     * @returns {Promise<void>}
     */
    async _writeHistory(history) {
        try {
            fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2), 'utf-8');
        } catch (error) {
            Logger.error('写入历史记录失败', { error: error.message });
            throw error;
        }
    }
}
