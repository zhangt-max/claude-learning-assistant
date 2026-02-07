// server.js - Express后端服务器
import express from 'express';
import cors from 'cors';
import { InteractiveTutor } from './src/features/InteractiveTutor.js';
import { CodeExplainer } from './src/features/CodeExplainer.js';
import { ConceptTeacher } from './src/features/ConceptTeacher.js';
import { CodeGenerator } from './src/features/CodeGenerator.js';
import { TokenTracker } from './src/core/TokenTracker.js';
import { Config } from './config.js';

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 初始化组件
const tokenTracker = new TokenTracker(Config.DAILY_BUDGET);
const features = {
    tutor: new InteractiveTutor({ tokenTracker }),
    explainer: new CodeExplainer({ tokenTracker }),
    teacher: new ConceptTeacher({ tokenTracker }),
    generator: new CodeGenerator({ tokenTracker })
};

// 初始化所有功能模块
await Promise.all(Object.values(features).map(f => f.initialize()));

// API路由
app.post('/api/chat', async (req, res) => {
    try {
        const { mode, message, conversationId } = req.body;

        // 验证请求参数
        if (!mode) {
            return res.status(400).json({ error: '模式参数缺失' });
        }
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

        // 获取对应的功能模块
        const feature = features[mode];
        if (!feature) {
            return res.status(400).json({ error: `无效的模式: ${mode}` });
        }

        // 执行对话（根据不同模式传递正确参数格式）
        let result;
        const temp = mode === 'generator' ? 0.2 : mode === 'explainer' ? 0.3 : 0.7;
        const maxT = mode === 'generator' ? 1000 : 800;

        if (mode === 'tutor') {
            // InteractiveTutor 期望 { question } 格式
            result = await feature.execute({
                question: message
            });
        } else if (mode === 'explainer') {
            // CodeExplainer 期望 { code } 格式
            result = await feature.execute({
                code: message,
                language: 'javascript'
            });
        } else if (mode === 'teacher') {
            // ConceptTeacher 期望 { concept } 格式
            result = await feature.execute({
                concept: message,
                language: 'javascript',
                level: 'intermediate'
            });
        } else if (mode === 'generator') {
            // CodeGenerator 期望 { requirement } 格式
            result = await feature.execute({
                requirement: message,
                language: 'javascript'
            });
        } else {
            // 默认格式 - 直接传递message
            result = await feature.execute({
                question: message
            });
        }

        // 获取使用统计
        const budgetStatus = tokenTracker.checkBudget();

        res.json({
            success: true,
            response: result.response,
            usage: result.usage,
            budget: {
                currentCost: budgetStatus.currentCost,
                remaining: budgetStatus.remaining,
                usage: budgetStatus.usage
            }
        });

    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({
            success: false,
            error: error.message || '服务器错误'
        });
    }
});

// 清空对话历史
app.post('/api/clear', async (req, res) => {
    try {
        const { mode } = req.body;
        const feature = features[mode];

        if (feature) {
            feature.clearConversation();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取状态信息
app.get('/api/status', (req, res) => {
    const report = tokenTracker.getReport();
    const budgetStatus = tokenTracker.checkBudget();

    res.json({
        success: true,
        tokens: report.totalTokens,
        cost: report.currentCost,
        remaining: budgetStatus.remaining,
        budget: Config.DAILY_BUDGET,
        model: Config.DEFAULT_MODEL,
        provider: Config.IS_ZHIPU ? '智谱AI' : 'Anthropic'
    });
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        model: Config.DEFAULT_MODEL,
        provider: Config.IS_ZHIPU ? '智谱AI' : 'Anthropic'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        🌐 Claude Learning Assistant - Web Server         ║
║                                                          ║
║  服务器地址: http://localhost:${PORT}                      ║
║  API端点:   http://localhost:${PORT}/api                   ║
║                                                          ║
║  模型: ${Config.DEFAULT_MODEL.padStart(36)}                       ║
║  提供商: ${(Config.IS_ZHIPU ? '智谱AI' : 'Anthropic').padStart(32)} ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});

export { app };
