// src/index.js
import { Display } from './ui/Display.js';
import { Menu } from './ui/Menu.js';
import { TokenTracker } from './core/TokenTracker.js';
import { HistoryManager } from './storage/HistoryManager.js';
import { InteractiveTutor } from './features/InteractiveTutor.js';
import { CodeExplainer } from './features/CodeExplainer.js';
import { ConceptTeacher } from './features/ConceptTeacher.js';
import { CodeGenerator } from './features/CodeGenerator.js';
import { Config } from '../config.js';
import { calculateCost } from './utils/cost-calculator.js';
import { ClaudeAPIError } from './core/ClaudeClient.js';
import { Logger } from './utils/logger.js';
import readline from 'readline';

/**
 * Claude 学习助手主应用类
 */
class App {
    constructor() {
        this.version = '1.0.0';
        this.name = 'Claude 学习助手';
        this.running = false;
        this.tokenTracker = null;
        this.historyManager = null;
        this.currentSession = {
            id: null,
            mode: null,
            startTime: null,
            messageCount: 0
        };
    }

    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            Display.clear();
            Display.title(this.name, { style: 'banner' });

            // 验证配置
            Display.info('正在验证配置...', { type: 'info' });
            Config.validate();
            Display.success('配置验证通过');

            // 初始化 Token 追踪器
            this.tokenTracker = new TokenTracker(Config.DAILY_BUDGET);
            Display.success('Token 追踪器已初始化');

            // 初始化历史记录管理器
            this.historyManager = new HistoryManager();
            await this.historyManager.initialize();
            Display.success('历史记录管理器已初始化');

            Display.separator();

            // 显示每日预算信息
            const budgetStatus = this.tokenTracker.checkBudget();
            Display.info(`每日预算: $${Config.DAILY_BUDGET.toFixed(2)}`, { type: 'info' });

        } catch (error) {
            Display.error('初始化失败', error);
            process.exit(1);
        }
    }

    /**
     * 运行主应用
     * @returns {Promise<void>}
     */
    async run() {
        this.running = true;

        while (this.running) {
            try {
                // 显示主菜单
                const choice = await this._showMainMenu();

                // 处理用户选择
                await this._handleMenuChoice(choice);

            } catch (error) {
                if (error instanceof ClaudeAPIError) {
                    Display.error('API 错误', error);
                } else {
                    Display.error('发生错误', error);
                }

                const retry = await Menu.confirm('是否返回主菜单?', { default: true });
                if (!retry) {
                    this.running = false;
                }
            }
        }

        await this._handleExit();
    }

    /**
     * 显示主菜单
     * @returns {Promise<string>} 用户选择的选项
     * @private
     */
    async _showMainMenu() {
        const menuOptions = [
            {
                key: '1',
                label: '互动问答',
                description: '与 Claude 进行交互式学习和问答',
                action: async () => await this._runFeature('interactive-tutor')
            },
            {
                key: '2',
                label: '代码解释',
                description: '解释和分析代码片段',
                action: async () => await this._runFeature('code-explainer')
            },
            {
                key: '3',
                label: '概念讲解',
                description: '深入学习技术概念',
                action: async () => await this._runFeature('concept-teacher')
            },
            {
                key: '4',
                label: '代码生成',
                description: '根据需求生成代码',
                action: async () => await this._runFeature('code-generator')
            },
            {
                key: '5',
                label: '查看历史',
                description: '查看使用历史和统计',
                action: async () => await this._showHistory()
            },
            {
                key: '6',
                label: '预算状态',
                description: '查看当前预算使用情况',
                action: async () => await this._showBudgetStatus()
            },
            {
                key: 'q',
                label: '退出',
                description: '退出程序',
                action: async () => {
                    this.running = false;
                },
                exit: false
            }
        ];

        await Menu.show(menuOptions, {
            title: 'Claude 学习助手',
            prompt: '请选择功能',
            loop: false
        });

        return '0'; // 这里的返回值不会被使用，因为 action 已经处理了
    }

    /**
     * 处理菜单选择
     * @param {string} choice - 用户选择的选项
     * @private
     */
    async _handleMenuChoice(choice) {
        // 这个方法目前是空的，因为逻辑已经在 _showMainMenu 的 action 中处理
    }

    /**
     * 运行互动问答功能
     * @returns {Promise<void>}
     * @private
     */
    async _runInteractiveTutor() {
        try {
            // 创建新会话
            this.currentSession = {
                id: null,
                mode: 'interactive-tutor',
                startTime: new Date().toISOString(),
                messageCount: 0
            };

            const tutor = new InteractiveTutor();

            // 创建 readline 接口
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            // 包装输入输出函数
            const inputCallback = () => {
                return new Promise((resolve) => {
                    rl.question(Display.colorize('\n你', 'green') + ': ', (answer) => {
                        resolve(answer);
                    });
                });
            };

            const outputCallback = (message) => {
                console.log(message);
            };

            // 启动交互式会话
            await tutor.startInteractiveSession(inputCallback, outputCallback);

            // 会话结束后保存
            rl.close();
            await this._endSession();

        } catch (error) {
            Logger.error('互动问答运行失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 运行功能模块的通用方法
     * @param {string} featureType - 功能类型
     * @returns {Promise<void>}
     * @private
     */
    async _runFeature(featureType) {
        try {
            // 创建新会话
            this.currentSession = {
                id: null,
                mode: featureType,
                startTime: new Date().toISOString(),
                messageCount: 0
            };

            // 根据类型创建对应的功能实例
            let feature;
            switch (featureType) {
                case 'interactive-tutor':
                    feature = new InteractiveTutor();
                    break;
                case 'code-explainer':
                    feature = new CodeExplainer();
                    break;
                case 'concept-teacher':
                    feature = new ConceptTeacher();
                    break;
                case 'code-generator':
                    feature = new CodeGenerator();
                    break;
                default:
                    throw new Error(`未知的功能类型: ${featureType}`);
            }

            // 创建 readline 接口
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            // 包装输入输出函数
            const inputCallback = () => {
                return new Promise((resolve) => {
                    rl.question(Display.colorize('\n你', 'green') + ': ', (answer) => {
                        resolve(answer);
                    });
                });
            };

            const outputCallback = (message) => {
                console.log(message);
            };

            // 启动交互式会话
            await feature.startInteractiveSession(inputCallback, outputCallback);

            // 会话结束后保存
            rl.close();
            await this._endSession();

        } catch (error) {
            if (error instanceof ClaudeAPIError) {
                this._handleAPIError(error);
            } else {
                Logger.error(`${featureType} 运行失败`, { error: error.message });
                Display.error('运行失败', error);
            }

            const retry = await Menu.confirm('是否返回主菜单?', { default: true });
            if (!retry) {
                this.running = false;
            }
        }
    }

    /**
     * 处理 API 错误
     * @param {ClaudeAPIError} error - API 错误对象
     * @private
     */
    _handleAPIError(error) {
        Display.clear();
        Display.title('API 错误', { style: 'error' });

        switch (error.code) {
            case 'RATE_LIMIT':
                Display.error('API 请求过于频繁', new Error('请稍后再试或升级您的 API 计划'));
                Display.info('建议：', { type: 'info' });
                Display.list([
                    '等待一段时间后重试',
                    '检查您的 API 使用配额',
                    '考虑升级到更高层级的 API 计划'
                ]);
                break;

            case 'INVALID_API_KEY':
                Display.error('API 密钥无效', new Error('请检查 .env 文件中的 ANTHROPIC_API_KEY'));
                Display.info('建议：', { type: 'info' });
                Display.list([
                    '确认 API Key 是否正确复制',
                    '检查 API Key 是否已过期',
                    '访问 https://console.anthropic.com/ 获取新的 API Key'
                ]);
                break;

            case 'NETWORK_ERROR':
                Display.error('网络连接失败', new Error('请检查您的网络连接'));
                Display.info('建议：', { type: 'info' });
                Display.list([
                    '检查网络连接是否正常',
                    '尝试切换到不同的网络',
                    '检查防火墙设置',
                    '如果使用代理，请确认代理配置正确'
                ]);
                break;

            case 'INVALID_REQUEST':
                Display.error('请求参数错误', error);
                Display.info('建议：', { type: 'info' });
                Display.list([
                    '检查输入内容是否符合要求',
                    '尝试简化您的请求',
                    '如果问题持续，请报告此问题'
                ]);
                break;

            default:
                Display.error('未知 API 错误', error);
                Display.info('错误详情：', { type: 'info' });
                console.log(`  错误代码: ${error.code}`);
                console.log(`  错误消息: ${error.message}`);
                if (error.details) {
                    console.log(`  详细信息: ${JSON.stringify(error.details)}`);
                }
        }

        console.log('');
    }

    /**
     * 显示历史记录
     * @returns {Promise<void>}
     * @private
     */
    async _showHistory() {
        Display.clear();
        Display.title('使用历史', { style: 'box' });

        const stats = await this.historyManager.getStatistics();

        if (stats.totalSessions === 0) {
            console.log('');
            Display.info('暂无历史记录', { type: 'info' });
            console.log('');
        } else {
            console.log('');
            Display.info(`总会话数: ${stats.totalSessions}`, { type: 'info' });
            Display.info(`总成本: $${stats.totalCost.toFixed(6)}`, { type: 'info' });
            Display.info(`总Token数: ${stats.totalTokens.toLocaleString()}`, { type: 'info' });
            Display.info(`平均每会话成本: $${stats.averageCostPerSession.toFixed(6)}`, { type: 'info' });
            console.log('');

            if (Object.keys(stats.modeStats).length > 0) {
                Display.title('按模式统计', { style: 'simple' });
                Object.entries(stats.modeStats).forEach(([mode, data]) => {
                    console.log(`  ${mode}:`);
                    console.log(`    会话数: ${data.count}`);
                    console.log(`    总成本: $${data.totalCost.toFixed(6)}`);
                    console.log(`    总Token数: ${data.totalTokens.toLocaleString()}`);
                    console.log('');
                });
            }

            // 显示最近的会话
            const recentSessions = await this.historyManager.getSessions(5);
            if (recentSessions.length > 0) {
                Display.title('最近会话', { style: 'simple' });
                recentSessions.forEach((session, index) => {
                    console.log(`  ${index + 1}. ${session.mode}`);
                    console.log(`     时间: ${new Date(session.startTime).toLocaleString('zh-CN')}`);
                    console.log(`     成本: $${(session.usage?.cost || 0).toFixed(6)}`);
                    console.log(`     Token数: ${(session.usage?.totalTokens || 0).toLocaleString()}`);
                    console.log('');
                });
            }
        }

        await Menu.sleep(3000);
    }

    /**
     * 显示预算状态
     * @returns {Promise<void>}
     * @private
     */
    async _showBudgetStatus() {
        Display.clear();
        const report = this.tokenTracker.displayReport();
        console.log(report);

        const stats = await this.historyManager.getStatistics();
        console.log('');
        console.log(`  历史总成本: $${stats.totalCost.toFixed(6)}`);
        console.log('');

        await Menu.sleep(3000);
    }

    /**
     * 结束当前会话
     * @returns {Promise<void>}
     * @private
     */
    async _endSession() {
        if (!this.currentSession.mode) {
            return;
        }

        try {
            // 保存会话记录
            const sessionId = await this.historyManager.saveSession({
                id: this.currentSession.id,
                mode: this.currentSession.mode,
                startTime: this.currentSession.startTime,
                endTime: new Date().toISOString(),
                usage: this.tokenTracker.usage,
                messageCount: this.currentSession.messageCount
            });

            // 显示会话报告
            Display.separator();
            Display.success('会话已保存');
            console.log(`  会话ID: ${sessionId}`);
            console.log(`  消息数: ${this.currentSession.messageCount}`);
            console.log(`  Token使用: ${this.tokenTracker.usage.totalTokens.toLocaleString()}`);
            console.log(`  成本: $${this.tokenTracker.usage.cost.toFixed(6)}`);
            console.log('');

            // 重置会话
            this.currentSession = {
                id: null,
                mode: null,
                startTime: null,
                messageCount: 0
            };

        } catch (error) {
            Logger.error('保存会话失败', { error: error.message });
        }
    }

    /**
     * 处理退出
     * @returns {Promise<void>}
     * @private
     */
    async _handleExit() {
        Display.clear();
        Display.separator();
        Display.success('感谢使用 Claude 学习助手！');

        // 显示最终报告
        if (this.tokenTracker && this.tokenTracker.getCurrentCost() > 0) {
            console.log('');
            console.log(this.tokenTracker.displayReport());
        }

        console.log('');
        console.log('再见！');
        console.log('');
    }
}

/**
 * 主入口函数
 */
async function main() {
    const app = new App();
    await app.initialize();
    await app.run();
}

// 运行应用
main().catch((error) => {
    Logger.error('程序异常退出', { error: error.message });
    process.exit(1);
});
