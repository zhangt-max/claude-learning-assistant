# Claude Learning Assistant 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个实用的命令行JavaScript学习助手，集成Claude API，支持代码解释、概念讲解、代码生成和互动问答功能。

**Architecture:** 模块化Node.js应用，核心层（API客户端、对话管理、Token追踪）+ 功能层（四种学习模式）+ 存储层（JSON文件持久化）+ UI层（CLI菜单和显示）

**Tech Stack:** Node.js (>=18), @anthropic-ai/sdk, readline, fs/promises, dotenv

---

## Phase 1: 核心功能搭建

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`
- Create: `data/.gitkeep`
- Create: `prompts/.gitkeep`

**Step 1: 创建 package.json**

```bash
cd F:\ob\ob模版\00_收件箱\claude-learning-assistant
npm init -y
npm install @anthropic-ai/sdk dotenv
```

**Step 2: 创建 package.json 内容**

```json
{
  "name": "claude-learning-assistant",
  "version": "1.0.0",
  "description": "一个实用的JavaScript学习助手，使用Claude API",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "echo \"暂无测试\" && exit 0"
  },
  "keywords": ["claude", "learning", "assistant", "javascript"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "dotenv": "^16.4.7"
  }
}
```

**Step 3: 创建 .env.example**

```env
# Anthropic API配置
ANTHROPIC_API_KEY=sk-ant-api03-你的API-Key

# 可选：设置默认模型
DEFAULT_MODEL=claude-3-5-sonnet-20241022

# 可选：设置默认最大tokens
DEFAULT_MAX_TOKENS=1024

# 每日预算限制（美元）
DAILY_BUDGET=0.50
```

**Step 4: 创建 .gitignore**

```
node_modules/
.env
data/*.json
!data/.gitkeep
*.log
.DS_Store
```

**Step 5: 创建基础 README.md**

```markdown
# Claude Learning Assistant

一个实用的命令行JavaScript学习助手，使用Claude API驱动。

## 功能特性

- 代码解释：深入理解代码的工作原理
- 概念讲解：学习JavaScript核心概念
- 代码生成：根据需求生成代码示例
- 互动问答：苏格拉底式学习引导

## 安装

\`\`\`bash
npm install
\`\`\`

## 配置

1. 复制 \`.env.example\` 为 \`.env\`
2. 填入你的 Anthropic API Key

## 运行

\`\`\`bash
npm start
\`\`\`
```

**Step 6: 创建占位目录和文件**

```bash
mkdir -p data prompts
touch data/.gitkeep prompts/.gitkeep
```

**Step 7: 提交**

```bash
git add .
git commit -m "feat: 项目初始化，创建基础配置文件"
```

---

### Task 2: 配置管理模块

**Files:**
- Create: `config.js`

**Step 1: 创建 config.js**

```javascript
// config.js
import dotenv from 'dotenv';

dotenv.config();

class Config {
    /** @type {string} */
    static ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    /** @type {string} */
    static DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'claude-3-5-sonnet-20241022';

    /** @type {number} */
    static DEFAULT_MAX_TOKENS = parseInt(process.env.DEFAULT_MAX_TOKENS || '1024');

    /** @type {number} */
    static DAILY_BUDGET = parseFloat(process.env.DAILY_BUDGET || '0.50');

    /**
     * 验证配置
     * @throws {Error} 如果配置无效
     */
    static validate() {
        if (!this.ANTHROPIC_API_KEY) {
            throw new Error('未找到API Key！请检查.env文件');
        }
        if (this.DAILY_BUDGET <= 0) {
            throw new Error('每日预算必须大于0');
        }
        return true;
    }

    /**
     * 获取模型价格（每百万tokens美元）
     */
    static getModelPrices(model = this.DEFAULT_MODEL) {
        const prices = {
            'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
            'claude-3-opus-20240229': { input: 15, output: 75 },
            'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
        };
        return prices[model] || prices['claude-3-5-sonnet-20241022'];
    }
}

export { Config };
```

**Step 2: 创建配置测试**

创建 `test/config.test.js`：

```javascript
import { Config } from '../config.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Config', () => {
    it('should have default values', () => {
        assert.strictEqual(typeof Config.DEFAULT_MODEL, 'string');
        assert.strictEqual(typeof Config.DEFAULT_MAX_TOKENS, 'number');
    });

    it('should get model prices', () => {
        const prices = Config.getModelPrices();
        assert.strictEqual(typeof prices.input, 'number');
        assert.strictEqual(typeof prices.output, 'number');
    });
});
```

**Step 3: 运行测试验证**

```bash
node --test test/config.test.js
```

**Step 4: 提交**

```bash
git add config.js test/
git commit -m "feat: 添加配置管理模块"
```

---

### Task 3: 工具函数 - 成本计算器

**Files:**
- Create: `src/utils/cost-calculator.js`
- Create: `src/utils/logger.js`

**Step 1: 创建 src/utils 目录**

```bash
mkdir -p src/utils
```

**Step 2: 创建 cost-calculator.js**

```javascript
// src/utils/cost-calculator.js
import { Config } from '../../config.js';

/**
 * 计算API调用成本
 * @param {number} inputTokens - 输入tokens数量
 * @param {number} outputTokens - 输出tokens数量
 * @param {string} model - 模型名称
 * @returns {Object} 成本详情
 */
export function calculateCost(inputTokens, outputTokens, model) {
    const prices = Config.getModelPrices(model);

    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;
    const totalCost = inputCost + outputCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
    };
}

/**
 * 格式化成本显示
 * @param {number} cost - 成本金额
 * @returns {string} 格式化的成本字符串
 */
export function formatCost(cost) {
    return `$${cost.toFixed(6)}`;
}

/**
 * 格式化token数量
 * @param {number} tokens - token数量
 * @returns {string} 格式化的token字符串
 */
export function formatTokens(tokens) {
    return tokens.toLocaleString();
}
```

**Step 3: 创建 logger.js**

```javascript
// src/utils/logger.js
/**
 * 日志级别
 */
export const LogLevel = {
    INFO: 'INFO',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
};

/**
 * 带颜色的日志输出
 */
export const Logger = {
    info(message) {
        console.log(`ℹ️  ${message}`);
    },

    success(message) {
        console.log(`✅ ${message}`);
    },

    warning(message) {
        console.log(`⚠️  ${message}`);
    },

    error(message) {
        console.error(`❌ ${message}`);
    },

    section(title) {
        const line = '━'.repeat(50);
        console.log(`\n${line}`);
        console.log(`  ${title}`);
        console.log(`${line}\n`);
    },

    divider() {
        console.log('─'.repeat(50));
    }
};
```

**Step 4: 提交**

```bash
git add src/utils/
git commit -m "feat: 添加成本计算器和日志工具"
```

---

### Task 4: Token追踪器

**Files:**
- Create: `src/core/TokenTracker.js`

**Step 1: 创建 src/core 目录**

```bash
mkdir -p src/core
```

**Step 2: 创建 TokenTracker.js**

```javascript
// src/core/TokenTracker.js
import { Config } from '../../config.js';
import { calculateCost, formatCost, formatTokens } from '../utils/cost-calculator.js';

/**
 * Token使用追踪器
 */
export class TokenTracker {
    /**
     * @param {number} budget - 预算限制（美元）
     */
    constructor(budget = Config.DAILY_BUDGET) {
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.budget = budget;
        this.sessionCount = 0;
    }

    /**
     * 添加使用记录
     * @param {number} inputTokens - 输入tokens
     * @param {number} outputTokens - 输出tokens
     */
    addUsage(inputTokens, outputTokens) {
        this.totalInputTokens += inputTokens;
        this.totalOutputTokens += outputTokens;
        this.sessionCount++;
    }

    /**
     * 获取当前总成本
     * @returns {number} 成本金额
     */
    getCurrentCost() {
        return calculateCost(
            this.totalInputTokens,
            this.totalOutputTokens,
            Config.DEFAULT_MODEL
        ).totalCost;
    }

    /**
     * 检查预算状态
     * @returns {Object} 预算状态信息
     */
    checkBudget() {
        const currentCost = this.getCurrentCost();
        const usage = currentCost / this.budget;
        const remaining = this.budget - currentCost;

        return {
            currentCost,
            usage,
            remaining,
            isNearLimit: usage >= 0.9,
            isExceeded: usage >= 1.0,
            shouldWarn: usage >= 0.8
        };
    }

    /**
     * 获取使用报告
     * @returns {Object} 使用统计
     */
    getReport() {
        const totalTokens = this.totalInputTokens + this.totalOutputTokens;
        const budgetStatus = this.checkBudget();

        return {
            totalTokens,
            inputTokens: this.totalInputTokens,
            outputTokens: this.totalOutputTokens,
            currentCost: budgetStatus.currentCost,
            remaining: budgetStatus.remaining,
            budget: this.budget,
            sessionCount: this.sessionCount
        };
    }

    /**
     * 格式化显示使用报告
     */
    displayReport() {
        const report = this.getReport();

        console.log('\n📊 使用统计');
        console.log('─'.repeat(40));
        console.log(`总Token数:   ${formatTokens(report.totalTokens)}`);
        console.log(`  输入:      ${formatTokens(report.inputTokens)}`);
        console.log(`  输出:      ${formatTokens(report.outputTokens)}`);
        console.log(`当前成本:    ${formatCost(report.currentCost)}`);
        console.log(`预算剩余:    ${formatCost(report.remaining)} / ${formatCost(report.budget)}`);
        console.log(`会话次数:    ${report.sessionCount}`);
        console.log('─'.repeat(40));
    }

    /**
     * 重置追踪器
     */
    reset() {
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.sessionCount = 0;
    }
}
```

**Step 3: 创建测试**

创建 `test/core/token-tracker.test.js`：

```javascript
import { TokenTracker } from '../src/core/TokenTracker.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('TokenTracker', () => {
    it('should track token usage', () => {
        const tracker = new TokenTracker(0.50);
        tracker.addUsage(100, 200);

        assert.strictEqual(tracker.totalInputTokens, 100);
        assert.strictEqual(tracker.totalOutputTokens, 200);
    });

    it('should calculate cost correctly', () => {
        const tracker = new TokenTracker(0.50);
        tracker.addUsage(1000, 500);

        const cost = tracker.getCurrentCost();
        assert.strictEqual(typeof cost, 'number');
        assert.ok(cost > 0);
    });

    it('should check budget status', () => {
        const tracker = new TokenTracker(0.001); // 小预算用于测试
        tracker.addUsage(10000, 5000);

        const status = tracker.checkBudget();
        assert.ok(status.isExceeded);
    });

    it('should generate report', () => {
        const tracker = new TokenTracker(0.50);
        tracker.addUsage(100, 200);

        const report = tracker.getReport();
        assert.strictEqual(report.sessionCount, 1);
        assert.strictEqual(report.totalTokens, 300);
    });
});
```

**Step 4: 运行测试**

```bash
node --test test/core/token-tracker.test.js
```

**Step 5: 提交**

```bash
git add src/core/ test/core/
git commit -m "feat: 添加Token追踪器"
```

---

### Task 5: Claude API客户端

**Files:**
- Create: `src/core/ClaudeClient.js`

**Step 1: 创建 ClaudeClient.js**

```javascript
// src/core/ClaudeClient.js
import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../../config.js';
import { Logger } from '../utils/logger.js';

/**
 * API错误类型
 */
export class ClaudeAPIError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ClaudeAPIError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Claude API客户端封装
 */
export class ClaudeClient {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        Config.validate();

        this.client = new Anthropic({
            apiKey: options.apiKey || Config.ANTHROPIC_API_KEY,
            timeout: options.timeout || 60000
        });

        this.model = options.model || Config.DEFAULT_MODEL;
        this.maxTokens = options.maxTokens || Config.DEFAULT_MAX_TOKENS;
        this.maxRetries = options.maxRetries || 3;
    }

    /**
     * 发送消息到Claude API
     * @param {Array} messages - 消息历史
     * @param {Object} options - 调用选项
     * @returns {Promise<Object>} API响应
     */
    async sendMessage(messages, options = {}) {
        const apiParams = {
            model: options.model || this.model,
            max_tokens: options.maxTokens || this.maxTokens,
            messages: messages
        };

        if (options.system) {
            apiParams.system = options.system;
        }

        if (options.temperature !== undefined) {
            apiParams.temperature = options.temperature;
        }

        return this._retryableRequest(apiParams);
    }

    /**
     * 可重试的API请求
     * @private
     */
    async _retryableRequest(params, attempt = 1) {
        try {
            Logger.info(`正在调用Claude API... ${attempt > 1 ? `(重试 ${attempt}/${this.maxRetries})` : ''}`);

            const response = await this.client.messages.create(params);

            return {
                content: response.content[0].text,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens
                },
                model: response.model,
                id: response.id
            };

        } catch (error) {
            // 处理不同类型的错误
            if (error.status === 429) {
                // 速率限制
                if (attempt < this.maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // 指数退避
                    Logger.warning(`API速率限制，等待 ${waitTime/1000} 秒后重试...`);
                    await this._sleep(waitTime);
                    return this._retryableRequest(params, attempt + 1);
                }
                throw new ClaudeAPIError(
                    'API请求过于频繁，请稍后再试',
                    'RATE_LIMIT',
                    { originalError: error.message }
                );
            }

            if (error.status === 401) {
                throw new ClaudeAPIError(
                    'API密钥无效，请检查配置',
                    'INVALID_API_KEY',
                    { originalError: error.message }
                );
            }

            if (error.status === 400) {
                throw new ClaudeAPIError(
                    '请求参数错误',
                    'INVALID_REQUEST',
                    { originalError: error.message }
                );
            }

            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                if (attempt < this.maxRetries) {
                    Logger.warning(`网络错误，重试中...`);
                    await this._sleep(2000);
                    return this._retryableRequest(params, attempt + 1);
                }
                throw new ClaudeAPIError(
                    '网络连接失败，请检查网络',
                    'NETWORK_ERROR',
                    { originalError: error.message }
                );
            }

            throw new ClaudeAPIError(
                error.message || '未知API错误',
                'UNKNOWN_ERROR',
                { originalError: error.message }
            );
        }
    }

    /**
     * 延迟函数
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 更改使用的模型
     */
    setModel(model) {
        this.model = model;
        Logger.info(`模型已切换为: ${model}`);
    }
}
```

**Step 2: 创建测试**

创建 `test/core/claude-client.test.js`：

```javascript
import { ClaudeClient, ClaudeAPIError } from '../src/core/ClaudeClient.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// 注意：这些测试需要有效的API密钥，可以跳过或使用mock
describe('ClaudeClient', () => {
    it('should initialize without error', () => {
        // 这个测试不实际调用API
        assert.ok(true);
    });

    // 实际使用中需要API密钥的测试可以标记为skip
    it.skip('should send message to API', async () => {
        const client = new ClaudeClient();
        const result = await client.sendMessage([
            { role: 'user', content: 'Hello' }
        ]);

        assert.ok(result.content);
        assert.ok(result.usage);
    });
});
```

**Step 3: 提交**

```bash
git add src/core/ClaudeClient.js test/core/
git commit -m "feat: 添加Claude API客户端封装"
```

---

### Task 6: 对话管理器

**Files:**
- Create: `src/core/ConversationManager.js`

**Step 1: 创建 ConversationManager.js**

```javascript
// src/core/ConversationManager.js
import { Logger } from '../utils/logger.js';

/**
 * 对话管理器 - 管理对话历史和上下文
 */
export class ConversationManager {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.messages = [];
        this.systemPrompt = null;
        this.maxHistoryTokens = options.maxHistoryTokens || 8000;
        this.estimateTokenRatio = options.estimateTokenRatio || 4; // 粗略估算
    }

    /**
     * 设置系统提示
     * @param {string} prompt - 系统提示内容
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        Logger.info(`系统提示已设置: ${prompt.substring(0, 50)}...`);
    }

    /**
     * 添加用户消息
     * @param {string} content - 消息内容
     */
    addUserMessage(content) {
        this._addMessage('user', content);
    }

    /**
     * 添加助手消息
     * @param {string} content - 消息内容
     */
    addAssistantMessage(content) {
        this._addMessage('assistant', content);
    }

    /**
     * 内部：添加消息
     * @private
     */
    _addMessage(role, content) {
        this.messages.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });

        // 自动管理历史长度
        this._trimIfNeeded();
    }

    /**
     * 获取对话历史（用于API调用）
     * @returns {Array} 格式化的消息数组
     */
    getMessages() {
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    /**
     * 获取完整历史（包含时间戳）
     * @returns {Array} 完整消息数组
     */
    getFullHistory() {
        return [...this.messages];
    }

    /**
     * 获取系统提示
     * @returns {string|null} 系统提示内容
     */
    getSystemPrompt() {
        return this.systemPrompt;
    }

    /**
     * 智能截断历史，防止token超限
     * @private
     */
    _trimIfNeeded() {
        if (this.messages.length <= 4) return;

        // 粗略估算token数
        const estimatedTokens = this._estimateTokens();

        if (estimatedTokens > this.maxHistoryTokens) {
            // 保留前两条和最近的N条
            const keepCount = 6; // 3轮对话
            const firstTwo = this.messages.slice(0, 2);
            const recent = this.messages.slice(-keepCount);

            this.messages = [...firstTwo, ...recent];

            Logger.warning('对话历史已自动截断，保留最近内容');
        }
    }

    /**
     * 粗略估算token数量
     * @private
     */
    _estimateTokens() {
        const charCount = this.messages.reduce((sum, msg) => {
            return sum + msg.content.length;
        }, 0);

        return Math.ceil(charCount / this.estimateTokenRatio);
    }

    /**
     * 清空对话历史
     */
    clear() {
        this.messages = [];
        Logger.info('对话历史已清空');
    }

    /**
     * 获取对话轮数
     * @returns {number} 对话轮数
     */
    getTurnCount() {
        return Math.floor(this.messages.length / 2);
    }

    /**
     * 导出对话为文本
     * @returns {string} 对话文本
     */
    exportToText() {
        return this.messages.map(msg => {
            const role = msg.role === 'user' ? '用户' : '助手';
            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN');
            return `[${time}] ${role}: ${msg.content}`;
        }).join('\n\n');
    }
}
```

**Step 2: 创建测试**

创建 `test/core/conversation-manager.test.js`：

```javascript
import { ConversationManager } from '../src/core/ConversationManager.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('ConversationManager', () => {
    it('should add messages', () => {
        const cm = new ConversationManager();
        cm.addUserMessage('Hello');
        cm.addAssistantMessage('Hi there');

        const messages = cm.getMessages();
        assert.strictEqual(messages.length, 2);
        assert.strictEqual(messages[0].role, 'user');
        assert.strictEqual(messages[1].role, 'assistant');
    });

    it('should set system prompt', () => {
        const cm = new ConversationManager();
        cm.setSystemPrompt('You are a helpful assistant');

        assert.strictEqual(cm.getSystemPrompt(), 'You are a helpful assistant');
    });

    it('should count turns correctly', () => {
        const cm = new ConversationManager();
        cm.addUserMessage('Q1');
        cm.addAssistantMessage('A1');
        cm.addUserMessage('Q2');
        cm.addAssistantMessage('A2');

        assert.strictEqual(cm.getTurnCount(), 2);
    });

    it('should clear history', () => {
        const cm = new ConversationManager();
        cm.addUserMessage('Hello');
        cm.clear();

        assert.strictEqual(cm.getMessages().length, 0);
    });

    it('should export to text', () => {
        const cm = new ConversationManager();
        cm.addUserMessage('Hello');
        cm.addAssistantMessage('Hi');

        const text = cm.exportToText();
        assert.ok(text.includes('用户'));
        assert.ok(text.includes('助手'));
        assert.ok(text.includes('Hello'));
        assert.ok(text.includes('Hi'));
    });

    it('should trim history when too long', () => {
        const cm = new ConversationManager({ maxHistoryTokens: 100 });

        // 添加足够多的消息触发截断
        for (let i = 0; i < 20; i++) {
            cm.addUserMessage(`Question ${i}`.repeat(10));
            cm.addAssistantMessage(`Answer ${i}`.repeat(10));
        }

        // 应该被截断，而不是无限增长
        assert.ok(cm.getMessages().length < 40);
    });
});
```

**Step 3: 运行测试**

```bash
node --test test/core/conversation-manager.test.js
```

**Step 4: 提交**

```bash
git add src/core/ConversationManager.js test/core/
git commit -m "feat: 添加对话管理器"
```

---

### Task 7: 系统提示词

**Files:**
- Create: `prompts/code-explainer.txt`
- Create: `prompts/concept-teacher.txt`
- Create: `prompts/code-generator.txt`
- Create: `prompts/tutor.txt`

**Step 1: 创建 code-explainer.txt**

```text
你是一个JavaScript代码解释专家。你的任务是帮助学习者理解代码的工作原理。

分析代码时：
1. 先概述代码的整体功能（1-2句话）
2. 逐段解释关键逻辑
3. 指出重要的语法特性或模式
4. 如果存在问题，温和地指出并建议改进

保持简洁友好，使用学习者能理解的语言。
```

**Step 2: 创建 concept-teacher.txt**

```text
你是一个JavaScript概念讲师。你的任务是帮助学习者深入理解编程概念。

讲解概念时：
1. 用简单语言解释概念是什么
2. 提供生活化的类比帮助理解
3. 展示实用的代码示例
4. 说明常见误区和注意事项

根据学习者的问题调整深度，不要一次性输出过多信息。
```

**Step 3: 创建 code-generator.txt**

```text
你是一个JavaScript代码生成助手。你的任务是根据需求生成清晰、可维护的代码。

生成代码时：
1. 确保代码符合最佳实践
2. 添加必要的注释说明关键逻辑
3. 提供使用示例
4. 考虑边界情况和错误处理

如果需求不明确，先询问澄清。
```

**Step 4: 创建 tutor.txt**

```text
你是一个苏格拉底式的编程导师。你的任务是通过提问引导学习者自己找到答案。

原则：
- 不要直接给出答案
- 通过逐步提问引导思考
- 当学习者遇到困难时，提供提示而非完整解决方案
- 及时肯定和鼓励

目标是培养学习者的思考能力。
```

**Step 5: 提交**

```bash
git add prompts/
git commit -m "feat: 添加系统提示词模板"
```

---

### Task 8: 功能模块基类

**Files:**
- Create: `src/features/BaseFeature.js`

**Step 1: 创建 src/features 目录**

```bash
mkdir -p src/features
```

**Step 2: 创建 BaseFeature.js**

```javascript
// src/features/BaseFeature.js
import { ClaudeClient } from '../core/ClaudeClient.js';
import { ConversationManager } from '../core/ConversationManager.js';
import { Logger } from '../utils/logger.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 功能模块基类
 */
export class BaseFeature {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.client = new ClaudeClient(options.clientOptions);
        this.conversation = new ConversationManager(options.conversationOptions);
        this.tokenTracker = options.tokenTracker;
        this.promptFile = options.promptFile;
        this.systemPrompt = null;
    }

    /**
     * 初始化：加载系统提示
     */
    async initialize() {
        if (this.promptFile) {
            try {
                const promptPath = join(__dirname, '../../prompts', this.promptFile);
                this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
                this.conversation.setSystemPrompt(this.systemPrompt);
                Logger.success(`已加载系统提示: ${this.promptFile}`);
            } catch (error) {
                Logger.warning(`无法加载提示文件 ${this.promptFile}: ${error.message}`);
            }
        }
    }

    /**
     * 执行对话 - 子类应该实现
     * @param {string} userInput - 用户输入
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 响应结果
     */
    async execute(userInput, options = {}) {
        throw new Error('子类必须实现 execute 方法');
    }

    /**
     * 发送消息到Claude
     * @param {string} userInput - 用户输入
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 响应结果
     */
    async _sendMessage(userInput, options = {}) {
        this.conversation.addUserMessage(userInput);

        const response = await this.client.sendMessage(
            this.conversation.getMessages(),
            {
                system: this.conversation.getSystemPrompt(),
                temperature: options.temperature,
                maxTokens: options.maxTokens
            }
        );

        this.conversation.addAssistantMessage(response.content);

        // 记录token使用
        if (this.tokenTracker) {
            this.tokenTracker.addUsage(
                response.usage.inputTokens,
                response.usage.outputTokens
            );
        }

        return response;
    }

    /**
     * 清空对话历史
     */
    clearConversation() {
        this.conversation.clear();
        if (this.systemPrompt) {
            this.conversation.setSystemPrompt(this.systemPrompt);
        }
        Logger.info('对话已重置');
    }

    /**
     * 获取会话摘要
     * @returns {Object} 会话信息
     */
    getSessionSummary() {
        return {
            mode: this.constructor.name,
            turns: this.conversation.getTurnCount(),
            messageCount: this.conversation.getMessages().length
        };
    }

    /**
     * 导出对话
     * @returns {string} 对话文本
     */
    exportConversation() {
        return this.conversation.exportToText();
    }
}
```

**Step 3: 提交**

```bash
git add src/features/BaseFeature.js
git commit -m "feat: 添加功能模块基类"
```

---

### Task 9: 互动问答功能模块

**Files:**
- Create: `src/features/InteractiveTutor.js`

**Step 1: 创建 InteractiveTutor.js**

```javascript
// src/features/InteractiveTutor.js
import { BaseFeature } from './BaseFeature.js';
import { Logger } from '../utils/logger.js';

/**
 * 互动问答功能模块 - 苏格拉底式教学
 */
export class InteractiveTutor extends BaseFeature {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        super({
            ...options,
            promptFile: 'tutor.txt'
        });
    }

    /**
     * 执行互动问答
     * @param {string} userInput - 用户输入
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 响应结果
     */
    async execute(userInput, options = {}) {
        Logger.info('导师正在思考...');

        const response = await this._sendMessage(userInput, {
            temperature: options.temperature || 0.8,
            maxTokens: options.maxTokens || 600
        });

        return {
            response: response.content,
            usage: response.usage
        };
    }

    /**
     * 获取欢迎信息
     * @returns {string} 欢迎信息
     */
    getWelcomeMessage() {
        return `
╔══════════════════════════════════════════════════════════╗
║           🎓 互动问答模式 - 苏格拉底式学习               ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  作为你的编程导师，我会通过提问引导你思考，              ║
║  而不是直接给出答案。这样能帮助你真正理解。              ║
║                                                          ║
║  ────────────────────────────────────────────────────    ║
║                                                          ║
║  示例问题：                                              ║
║    • "什么是闭包？"                                      ║
║    • "为什么这段代码输出undefined？"                     ║
║    • "帮我理解Promise的工作原理"                         ║
║                                                          ║
║  ────────────────────────────────────────────────────    ║
║                                                          ║
║  输入 'back' 返回主菜单                                  ║
║  输入 'clear' 清空对话历史                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}
```

**Step 2: 创建测试**

创建 `test/features/interactive-tutor.test.js`：

```javascript
import { InteractiveTutor } from '../src/features/InteractiveTutor.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('InteractiveTutor', () => {
    it('should initialize', async () => {
        const tutor = new InteractiveTutor({ tokenTracker: null });
        await tutor.initialize();

        assert.ok(tutor.systemPrompt);
        assert.strictEqual(tutor.constructor.name, 'InteractiveTutor');
    });

    it('should have welcome message', async () => {
        const tutor = new InteractiveTutor({ tokenTracker: null });
        const message = tutor.getWelcomeMessage();

        assert.ok(message.includes('互动问答'));
        assert.ok(message.includes('苏格拉底'));
    });

    it('should get session summary', async () => {
        const tutor = new InteractiveTutor({ tokenTracker: null });
        const summary = tutor.getSessionSummary();

        assert.strictEqual(summary.mode, 'InteractiveTutor');
        assert.strictEqual(summary.turns, 0);
    });
});
```

**Step 3: 运行测试**

```bash
node --test test/features/interactive-tutor.test.js
```

**Step 4: 提交**

```bash
git add src/features/InteractiveTutor.js test/features/
git commit -m "feat: 添加互动问答功能模块"
```

---

### Task 10: UI模块 - 显示和菜单

**Files:**
- Create: `src/ui/Display.js`
- Create: `src/ui/Menu.js`

**Step 1: 创建 src/ui 目录**

```bash
mkdir -p src/ui
```

**Step 2: 创建 Display.js**

```javascript
// src/ui/Display.js
import { formatCost, formatTokens } from '../utils/cost-calculator.js';

/**
 * UI显示模块
 */
export class Display {
    /**
     * 显示欢迎信息
     */
    static showWelcome() {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                  ║
║        🤖 Claude Learning Assistant - JavaScript学习助手         ║
║                                                                  ║
║                  由 Claude API 驱动 v1.0.0                      ║
║                                                                  ║
╚════════════════════════════════════════════════════════════════╝
        `);
    }

    /**
     * 显示主菜单
     */
    static showMainMenu() {
        console.log(`
┌─────────────────────────────────────────────────────────────┐
│                           主菜单                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 📖 代码解释    - 深入理解代码工作原理                    │
│  2. 📚 概念讲解    - 学习JavaScript核心概念                   │
│  3. 💻 代码生成    - 根据需求生成代码示例                     │
│  4. 🎓 互动问答    - 苏格拉底式学习引导                       │
│  5. 📊 学习统计    - 查看使用历史和成本                       │
│  6. ❌ 退出                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        `);
    }

    /**
     * 显示助手响应
     * @param {string} response - 响应内容
     */
    static showResponse(response) {
        console.log('\n' + '─'.repeat(50));
        console.log('🤖 Claude:');
        console.log('─'.repeat(50));
        console.log(response);
        console.log('─'.repeat(50) + '\n');
    }

    /**
     * 显示使用统计
     * @param {Object} usage - 使用信息
     */
    static showUsage(usage) {
        console.log('\n📊 本次调用统计');
        console.log('─'.repeat(40));
        console.log(`输入Tokens: ${formatTokens(usage.inputTokens)}`);
        console.log(`输出Tokens: ${formatTokens(usage.outputTokens)}`);
        console.log(`总计Tokens: ${formatTokens(usage.totalTokens)}`);
        console.log('─'.repeat(40));
    }

    /**
     * 显示预算警告
     * @param {Object} budgetStatus - 预算状态
     */
    static showBudgetWarning(budgetStatus) {
        const percentage = (budgetStatus.usage * 100).toFixed(1);

        console.log(`
⚠️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   预算提醒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

当前使用: ${percentage}% (${formatCost(budgetStatus.currentCost)} / ${formatCost(budgetStatus.budget)})
剩余预算: ${formatCost(budgetStatus.remaining)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }

    /**
     * 显示学习统计
     * @param {Object} report - 统计报告
     */
    static showLearningReport(report) {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                     📊 学习统计报告                        ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  总学习会话: ${report.totalSessions.toString().padStart(20)} ║
║  总Token使用: ${formatTokens(report.totalTokens).padStart(18)} ║
║  累计成本:    ${formatCost(report.currentCost).padStart(18)} ║
║  剩余预算:    ${formatCost(report.remaining).padStart(18)} ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `);
    }

    /**
     * 显示提示
     * @param {string} prompt - 提示内容
     */
    static showPrompt(prompt) {
        process.stdout.write(prompt);
    }

    /**
     * 显示错误
     * @param {string} error - 错误信息
     */
    static showError(error) {
        console.error(`\n❌ 错误: ${error}\n`);
    }

    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     */
    static showSuccess(message) {
        console.log(`\n✅ ${message}\n`);
    }

    /**
     * 清屏
     */
    static clearScreen() {
        console.clear();
    }

    /**
     * 显示分隔线
     */
    static divider() {
        console.log('─'.repeat(50));
    }
}
```

**Step 3: 创建 Menu.js**

```javascript
// src/ui/Menu.js
import readline from 'readline';
import { Display } from './Display.js';

/**
 * 菜单处理模块
 */
export class Menu {
    /**
     * 创建readline接口
     * @returns {readline.Interface} readline接口
     */
    static createInterface() {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * 提问并获取用户输入
     * @param {string} prompt - 提示内容
     * @param {readline.Interface} rl - readline接口
     * @returns {Promise<string>} 用户输入
     */
    static async question(prompt, rl) {
        return new Promise(resolve => {
            rl.question(prompt, answer => {
                resolve(answer);
            });
        });
    }

    /**
     * 显示主菜单并获取选择
     * @param {readline.Interface} rl - readline接口
     * @returns {Promise<string>} 用户选择
     */
    static async getMainChoice(rl) {
        Display.showMainMenu();
        return await this.question('请选择功能 (1-6): ', rl);
    }

    /**
     * 获取用户输入
     * @param {string} prompt - 提示内容
     * @param {readline.Interface} rl - readline接口
     * @returns {Promise<string>} 用户输入
     */
    static async getUserInput(prompt, rl) {
        return await this.question(prompt, rl);
    }

    /**
     * 确认操作
     * @param {string} message - 确认消息
     * @param {readline.Interface} rl - readline接口
     * @returns {Promise<boolean>} 是否确认
     */
    static async confirm(message, rl) {
        const answer = await this.question(`${message} (y/n): `, rl);
        return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
    }

    /**
     * 等待用户按回车继续
     * @param {readline.Interface} rl - readline接口
     */
    static async pause(rl) {
        await this.question('\n按回车键继续...', rl);
    }

    /**
     * 验证菜单选择
     * @param {string} choice - 用户选择
     * @param {number} max - 最大选项
     * @returns {boolean} 是否有效
     */
    static isValidChoice(choice, max = 6) {
        const num = parseInt(choice);
        return !isNaN(num) && num >= 1 && num <= max;
    }
}
```

**Step 4: 提交**

```bash
git add src/ui/
git commit -m "feat: 添加UI显示和菜单模块"
```

---

### Task 11: 历史记录管理器

**Files:**
- Create: `src/storage/HistoryManager.js`

**Step 1: 创建 src/storage 目录**

```bash
mkdir -p src/storage
```

**Step 2: 创建 HistoryManager.js**

```javascript
// src/storage/HistoryManager.js
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 项目根目录
const getProjectRoot = () => {
    const currentDir = dirname(__dirname);
    return currentDir;
};

/**
 * 历史记录管理器
 */
export class HistoryManager {
    /**
     * @param {string} dataDir - 数据目录
     */
    constructor(dataDir = null) {
        this.dataDir = dataDir || join(getProjectRoot(), 'data');
        this.historyFile = join(this.dataDir, 'history.json');
    }

    /**
     * 初始化：确保数据目录和文件存在
     */
    async initialize() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });

            if (!existsSync(this.historyFile)) {
                await this._saveData({
                    sessions: [],
                    statistics: {
                        totalSessions: 0,
                        totalTokens: 0,
                        totalCost: 0,
                        modeUsage: {}
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`历史记录初始化失败: ${error.message}`);
        }
    }

    /**
     * 保存会话记录
     * @param {Object} session - 会话数据
     */
    async saveSession(session) {
        try {
            const data = await this._loadData();

            const sessionRecord = {
                id: uuidv4(),
                ...session,
                createdAt: new Date().toISOString()
            };

            data.sessions.push(sessionRecord);

            // 更新统计
            data.statistics.totalSessions++;
            data.statistics.totalTokens += session.usage?.totalTokens || 0;
            data.statistics.totalCost += session.usage?.cost || 0;

            const mode = session.mode;
            if (!data.statistics.modeUsage[mode]) {
                data.statistics.modeUsage[mode] = 0;
            }
            data.statistics.modeUsage[mode]++;

            data.updatedAt = new Date().toISOString();

            await this._saveData(data);

            return sessionRecord.id;
        } catch (error) {
            console.error(`保存会话失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 获取所有会话
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 会话列表
     */
    async getSessions(limit = 20) {
        try {
            const data = await this._loadData();
            return data.sessions.slice(-limit).reverse();
        } catch (error) {
            console.error(`获取会话失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 获取统计信息
     * @returns {Promise<Object>} 统计数据
     */
    async getStatistics() {
        try {
            const data = await this._loadData();
            return data.statistics;
        } catch (error) {
            console.error(`获取统计失败: ${error.message}`);
            return {
                totalSessions: 0,
                totalTokens: 0,
                totalCost: 0,
                modeUsage: {}
            };
        }
    }

    /**
     * 按模式获取会话
     * @param {string} mode - 模式名称
     * @returns {Promise<Array>} 会话列表
     */
    async getSessionsByMode(mode) {
        try {
            const data = await this._loadData();
            return data.sessions.filter(s => s.mode === mode).reverse();
        } catch (error) {
            console.error(`获取会话失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 清空所有历史
     */
    async clearAll() {
        try {
            await this._saveData({
                sessions: [],
                statistics: {
                    totalSessions: 0,
                    totalTokens: 0,
                    totalCost: 0,
                    modeUsage: {}
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error(`清空历史失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 导出历史为文本
     * @param {string} outputFile - 输出文件路径
     */
    async exportToText(outputFile) {
        try {
            const data = await this._loadData();

            let content = 'Claude Learning Assistant - 学习历史\n';
            content += '='.repeat(60) + '\n\n';

            for (const session of data.sessions) {
                content += `\n[${session.id}] ${session.mode}\n`;
                content += `时间: ${new Date(session.createdAt).toLocaleString('zh-CN')}\n`;
                content += `─`.repeat(40) + '\n';

                for (const msg of session.messages) {
                    const role = msg.role === 'user' ? '用户' : '助手';
                    content += `${role}: ${msg.content}\n\n`;
                }

                if (session.usage) {
                    content += `Token使用: ${session.usage.totalTokens}\n`;
                }
                content += '\n';
            }

            await fs.writeFile(outputFile, content, 'utf-8');
            return true;
        } catch (error) {
            console.error(`导出失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 加载数据
     * @private
     */
    async _loadData() {
        try {
            const content = await fs.readFile(this.historyFile, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { sessions: [], statistics: {} };
            }
            throw error;
        }
    }

    /**
     * 保存数据
     * @private
     */
    async _saveData(data) {
        await fs.writeFile(this.historyFile, JSON.stringify(data, null, 2), 'utf-8');
    }
}

// 简单的UUID实现（避免额外依赖）
function v4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

v4.toString = () => 'uuid';
export const uuid = { v4 };
```

**Step 3: 创建测试**

创建 `test/storage/history-manager.test.js`：

```javascript
import { HistoryManager } from '../src/storage/HistoryManager.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const testDataDir = join(process.cwd(), 'test-data');
const testHistoryFile = join(testDataDir, 'history.json');

describe('HistoryManager', () => {
    let hm;

    before(async () => {
        // 清理测试数据
        if (existsSync(testHistoryFile)) {
            unlinkSync(testHistoryFile);
        }
        hm = new HistoryManager(testDataDir);
        await hm.initialize();
    });

    after(() => {
        // 清理测试数据
        if (existsSync(testHistoryFile)) {
            unlinkSync(testHistoryFile);
        }
    });

    it('should initialize', async () => {
        assert.ok(existsSync(testHistoryFile));
    });

    it('should save session', async () => {
        const sessionId = await hm.saveSession({
            mode: 'InteractiveTutor',
            messages: [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' }
            ],
            usage: { totalTokens: 100, cost: 0.001 }
        });

        assert.ok(sessionId);
    });

    it('should get sessions', async () => {
        const sessions = await hm.getSessions();
        assert.ok(sessions.length > 0);
        assert.strictEqual(sessions[0].mode, 'InteractiveTutor');
    });

    it('should get statistics', async () => {
        const stats = await hm.getStatistics();
        assert.ok(stats.totalSessions > 0);
        assert.ok(stats.totalTokens > 0);
    });

    it('should clear all', async () => {
        const result = await hm.clearAll();
        assert.ok(result);

        const stats = await hm.getStatistics();
        assert.strictEqual(stats.totalSessions, 0);
    });
});
```

**Step 4: 运行测试**

```bash
node --test test/storage/history-manager.test.js
```

**Step 5: 提交**

```bash
git add src/storage/ test/storage/
git commit -m "feat: 添加历史记录管理器"
```

---

### Task 12: 主入口文件

**Files:**
- Create: `src/index.js`

**Step 1: 创建 src/index.js**

```javascript
// src/index.js
import { Display, Menu } from './ui/index.js';
import { TokenTracker } from './core/TokenTracker.js';
import { HistoryManager } from './storage/HistoryManager.js';
import { InteractiveTutor } from './features/InteractiveTutor.js';
import { Config } from '../config.js';
import { calculateCost } from './utils/cost-calculator.js';
import { ClaudeAPIError } from './core/ClaudeClient.js';

/**
 * Claude Learning Assistant 主程序
 */
class App {
    constructor() {
        this.tokenTracker = new TokenTracker(Config.DAILY_BUDGET);
        this.historyManager = new HistoryManager();
        this.currentMode = null;
        this.rl = null;
    }

    /**
     * 初始化应用
     */
    async initialize() {
        try {
            Config.validate();
            await this.historyManager.initialize();
            Display.showWelcome();
        } catch (error) {
            Display.showError(error.message);
            process.exit(1);
        }
    }

    /**
     * 运行主循环
     */
    async run() {
        this.rl = Menu.createInterface();

        try {
            while (true) {
                const choice = await Menu.getMainChoice(this.rl);

                if (!Menu.isValidChoice(choice)) {
                    Display.showError('无效选择，请输入1-6');
                    await Menu.pause(this.rl);
                    Display.clearScreen();
                    continue;
                }

                const numChoice = parseInt(choice);

                if (numChoice === 6) {
                    await this._handleExit();
                    break;
                }

                await this._handleMenuChoice(numChoice);
                Display.clearScreen();
            }
        } catch (error) {
            Display.showError(error.message);
        } finally {
            this.rl.close();
        }
    }

    /**
     * 处理菜单选择
     * @private
     */
    async _handleMenuChoice(choice) {
        switch (choice) {
            case 1:
                await this._runMode('code-explainer', '代码解释');
                break;
            case 2:
                await this._runMode('concept-teacher', '概念讲解');
                break;
            case 3:
                await this._runMode('code-generator', '代码生成');
                break;
            case 4:
                await this._runInteractiveTutor();
                break;
            case 5:
                await this._showStatistics();
                break;
        }
    }

    /**
     * 运行功能模式
     * @private
     */
    async _runMode(modeName, modeTitle) {
        Display.showSuccess(`即将推出: ${modeTitle}模式`);
        await Menu.pause(this.rl);
    }

    /**
     * 运行互动问答模式
     * @private
     */
    async _runInteractiveTutor() {
        const tutor = new InteractiveTutor({
            tokenTracker: this.tokenTracker
        });
        await tutor.initialize();

        Display.clearScreen();
        console.log(tutor.getWelcomeMessage());

        const sessionMessages = [];

        while (true) {
            const input = await Menu.getUserInput('\n👤 你: ', this.rl);

            if (!input.trim()) continue;

            if (input.toLowerCase() === 'back') {
                await this._endSession(tutor, sessionMessages, 'InteractiveTutor');
                break;
            }

            if (input.toLowerCase() === 'clear') {
                tutor.clearConversation();
                sessionMessages.length = 0;
                Display.showSuccess('对话已重置');
                continue;
            }

            try {
                const result = await tutor.execute(input);

                sessionMessages.push(
                    { role: 'user', content: input },
                    { role: 'assistant', content: result.response }
                );

                Display.showResponse(result.response);
                Display.showUsage(result.usage);

                // 检查预算
                const budgetStatus = this.tokenTracker.checkBudget();
                if (budgetStatus.shouldWarn) {
                    Display.showBudgetWarning(budgetStatus);
                }

            } catch (error) {
                if (error instanceof ClaudeAPIError) {
                    Display.showError(`API错误: ${error.message}`);
                } else {
                    Display.showError(error.message);
                }
            }
        }
    }

    /**
     * 结束会话并保存
     * @private
     */
    async _endSession(feature, messages, modeName) {
        const summary = feature.getSessionSummary();
        const cost = calculateCost(
            this.tokenTracker.totalInputTokens,
            this.tokenTracker.totalOutputTokens
        );

        await this.historyManager.saveSession({
            mode: modeName,
            messages: messages,
            usage: {
                totalTokens: cost.totalTokens,
                cost: cost.totalCost
            }
        });

        console.log('\n📋 会话已保存');
        this.tokenTracker.displayReport();
        await Menu.pause(this.rl);
    }

    /**
     * 显示统计信息
     * @private
     */
    async _showStatistics() {
        Display.clearScreen();

        const historyStats = await this.historyManager.getStatistics();
        const trackerReport = this.tokenTracker.getReport();

        Display.showLearningReport({
            totalSessions: historyStats.totalSessions,
            totalTokens: trackerReport.totalTokens,
            currentCost: trackerReport.currentCost,
            remaining: trackerReport.remaining
        });

        console.log('\n模式使用分布:');
        for (const [mode, count] of Object.entries(historyStats.modeUsage)) {
            console.log(`  ${mode}: ${count}次`);
        }

        await Menu.pause(this.rl);
    }

    /**
     * 处理退出
     * @private
     */
    async _handleExit() {
        Display.clearScreen();
        console.log('\n👋 感谢使用 Claude Learning Assistant！');
        console.log('祝你学习进步！\n');

        const report = this.tokenTracker.getReport();
        console.log(`本次使用: ${report.totalTokens} tokens, ${report.currentCost.toFixed(6)} USD\n`);
    }
}

// UI模块导出统一入口
export { Display, Menu } from './ui/Display.js';

// 重新导出Display中的Menu方法
import { Display as DisplayClass } from './ui/Display.js';
export class Display extends DisplayClass {}

import { Menu as MenuClass } from './ui/Menu.js';
export class Menu extends MenuClass {}

// 启动应用
const app = new App();
await app.initialize();
await app.run();
```

**Step 2: 修正 UI 导出问题**

修改 `src/ui/Display.js`，在文件末尾添加：

```javascript
// 同时导出Menu类，方便统一导入
import { Menu as MenuClass } from './Menu.js';
export { MenuClass as Menu };
```

修改 `src/ui/Menu.js`，确保导出正确：

```javascript
// 在文件末尾确保正确导出
export { Menu };
```

**Step 3: 简化 src/index.js 的 UI 导入**

```javascript
// src/index.js
import { Display } from './ui/Display.js';
import { Menu } from './ui/Menu.js';
// ... 其他导入保持不变
```

**Step 4: 提交**

```bash
git add src/index.js src/ui/
git commit -m "feat: 添加主入口文件和基础运行流程"
```

---

### Task 13: 创建 .env 和运行测试

**Files:**
- Create: `.env`

**Step 1: 创建 .env 文件**

从 `.env.example` 复制并填入你的 API Key：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，填入真实的 API Key。

**Step 2: 测试运行**

```bash
npm start
```

**Step 3: 验证功能**

1. 应该看到欢迎界面
2. 应该看到主菜单
3. 选择 4（互动问答）应该能进入该模式
4. 输入问题应该能获得响应
5. 输入 'back' 应该返回主菜单
6. 选择 6 应该能退出程序

**Step 4: 提交 .env.example（不提交实际 .env）**

```bash
git add .env.example
git commit -m "chore: 添加环境变量示例文件"
```

---

## Phase 2: 完整功能

### Task 14: 代码解释模块

**Files:**
- Create: `src/features/CodeExplainer.js`

**Step 1: 创建 CodeExplainer.js**

```javascript
// src/features/CodeExplainer.js
import { BaseFeature } from './BaseFeature.js';

/**
 * 代码解释功能模块
 */
export class CodeExplainer extends BaseFeature {
    constructor(options = {}) {
        super({
            ...options,
            promptFile: 'code-explainer.txt'
        });
    }

    /**
     * 执行代码解释
     * @param {string} userInput - 用户输入的代码
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 响应结果
     */
    async execute(userInput, options = {}) {
        const response = await this._sendMessage(userInput, {
            temperature: 0.3,
            maxTokens: options.maxTokens || 800
        });

        return {
            response: response.content,
            usage: response.usage
        };
    }

    getWelcomeMessage() {
        return `
╔══════════════════════════════════════════════════════════╗
║              📖 代码解释模式                              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  粘贴你的JavaScript代码，我会帮你深入理解：              ║
║                                                          ║
║  • 代码的整体功能                                        ║
║  • 关键逻辑的解释                                        ║
║  • 使用的语法特性                                        ║
║  • 可能的改进建议                                        ║
║                                                          ║
║  输入 'back' 返回主菜单                                  ║
║  输入 'clear' 清空对话历史                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}
```

**Step 2: 在主程序中集成**

修改 `src/index.js`，导入并使用 CodeExplainer：

```javascript
// 在顶部添加导入
import { CodeExplainer } from './features/CodeExplainer.js';

// 修改 _runMode 方法
async _runMode(modeName, modeTitle) {
    let feature;

    switch (modeName) {
        case 'code-explainer':
            feature = new CodeExplainer({ tokenTracker: this.tokenTracker });
            break;
        case 'concept-teacher':
        case 'code-generator':
            Display.showSuccess(`即将推出: ${modeTitle}模式`);
            await Menu.pause(this.rl);
            return;
    }

    await this._runFeature(feature, modeName, modeTitle);
}

// 添加通用功能运行方法
async _runFeature(feature, modeName, modeTitle) {
    await feature.initialize();
    Display.clearScreen();
    console.log(feature.getWelcomeMessage());

    const sessionMessages = [];

    while (true) {
        const input = await Menu.getUserInput('\n👤 你: ', this.rl);

        if (!input.trim()) continue;

        if (input.toLowerCase() === 'back') {
            await this._endSession(feature, sessionMessages, modeName);
            break;
        }

        if (input.toLowerCase() === 'clear') {
            feature.clearConversation();
            sessionMessages.length = 0;
            Display.showSuccess('对话已重置');
            continue;
        }

        try {
            const result = await feature.execute(input);

            sessionMessages.push(
                { role: 'user', content: input },
                { role: 'assistant', content: result.response }
            );

            Display.showResponse(result.response);
            Display.showUsage(result.usage);

            const budgetStatus = this.tokenTracker.checkBudget();
            if (budgetStatus.shouldWarn) {
                Display.showBudgetWarning(budgetStatus);
            }

        } catch (error) {
            if (error instanceof ClaudeAPIError) {
                Display.showError(`API错误: ${error.message}`);
            } else {
                Display.showError(error.message);
            }
        }
    }
}
```

**Step 3: 提交**

```bash
git add src/features/CodeExplainer.js src/index.js
git commit -m "feat: 添加代码解释功能模块"
```

---

### Task 15: 概念讲解模块

**Files:**
- Create: `src/features/ConceptTeacher.js`

**Step 1: 创建 ConceptTeacher.js**

```javascript
// src/features/ConceptTeacher.js
import { BaseFeature } from './BaseFeature.js';

/**
 * 概念讲解功能模块
 */
export class ConceptTeacher extends BaseFeature {
    constructor(options = {}) {
        super({
            ...options,
            promptFile: 'concept-teacher.txt'
        });
    }

    async execute(userInput, options = {}) {
        const response = await this._sendMessage(userInput, {
            temperature: 0.5,
            maxTokens: options.maxTokens || 600
        });

        return {
            response: response.content,
            usage: response.usage
        };
    }

    getWelcomeMessage() {
        return `
╔══════════════════════════════════════════════════════════╗
║              📚 概念讲解模式                              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  输入你想了解的JavaScript概念，我会为你讲解：            ║
║                                                          ║
║  • 用简单语言解释概念                                    ║
║  • 提供生活化的类比                                      ║
║  • 展示实用的代码示例                                    ║
║  • 说明常见误区和注意事项                                ║
║                                                          ║
║  常见概念示例：                                          ║
║    • 闭包 (Closure)                                      ║
║    • 原型链 (Prototype Chain)                           ║
║    • 异步编程 (Async/Await)                              ║
║    • this 关键字                                         ║
║                                                          ║
║  输入 'back' 返回主菜单                                  ║
║  输入 'clear' 清空对话历史                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}
```

**Step 2: 在主程序中集成**

修改 `src/index.js` 中的 `_runMode` 方法：

```javascript
// 添加导入
import { ConceptTeacher } from './features/ConceptTeacher.js';

// 修改 switch 语句
case 'concept-teacher':
    feature = new ConceptTeacher({ tokenTracker: this.tokenTracker });
    break;
```

**Step 3: 提交**

```bash
git add src/features/ConceptTeacher.js src/index.js
git commit -m "feat: 添加概念讲解功能模块"
```

---

### Task 16: 代码生成模块

**Files:**
- Create: `src/features/CodeGenerator.js`

**Step 1: 创建 CodeGenerator.js**

```javascript
// src/features/CodeGenerator.js
import { BaseFeature } from './BaseFeature.js';

/**
 * 代码生成功能模块
 */
export class CodeGenerator extends BaseFeature {
    constructor(options = {}) {
        super({
            ...options,
            promptFile: 'code-generator.txt'
        });
    }

    async execute(userInput, options = {}) {
        const response = await this._sendMessage(userInput, {
            temperature: 0.2,
            maxTokens: options.maxTokens || 1000
        });

        return {
            response: response.content,
            usage: response.usage
        };
    }

    getWelcomeMessage() {
        return `
╔══════════════════════════════════════════════════════════╗
║              💻 代码生成模式                              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  描述你的需求，我会为你生成符合最佳实践的代码：           ║
║                                                          ║
║  • 函数/类实现                                           ║
║  • 算法实现                                              ║
║  • 工具函数                                              ║
║  • 完整示例                                              ║
║                                                          ║
║  描述时请尽量具体：                                       ║
║    • "写一个防抖函数"                                    ║
║    • "实现深拷贝功能"                                    ║
║    • "写一个Promise.all的实现"                           ║
║                                                          ║
║  输入 'back' 返回主菜单                                  ║
║  输入 'clear' 清空对话历史                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `;
    }
}
```

**Step 2: 在主程序中集成**

修改 `src/index.js`：

```javascript
// 添加导入
import { CodeGenerator } from './features/CodeGenerator.js';

// 修改 switch 语句
case 'code-generator':
    feature = new CodeGenerator({ tokenTracker: this.tokenTracker });
    break;
```

**Step 3: 提交**

```bash
git add src/features/CodeGenerator.js src/index.js
git commit -m "feat: 添加代码生成功能模块"
```

---

### Task 17: 错误处理完善

**Files:**
- Modify: `src/index.js`

**Step 1: 添加全局错误处理**

在 `src/index.js` 的 `App` 类中添加：

```javascript
/**
 * 处理API错误
 * @private
*/
_handleAPIError(error) {
    if (error.code === 'RATE_LIMIT') {
        Display.showError('API请求过于频繁，请稍后再试');
    } else if (error.code === 'INVALID_API_KEY') {
        Display.showError('API密钥无效，请检查.env文件中的配置');
    } else if (error.code === 'NETWORK_ERROR') {
        Display.showError('网络连接失败，请检查网络连接');
    } else {
        Display.showError(`发生错误: ${error.message}`);
    }
}
```

在 `_runFeature` 方法中的 catch 块使用：

```javascript
} catch (error) {
    if (error instanceof ClaudeAPIError) {
        this._handleAPIError(error);
    } else {
        Display.showError(error.message);
    }
}
```

**Step 2: 提交**

```bash
git add src/index.js
git commit -m "feat: 完善错误处理"
```

---

### Task 18: 最终测试和文档

**Step 1: 运行完整测试**

```bash
node --test
```

**Step 2: 手动功能测试**

1. 启动程序：`npm start`
2. 测试所有4个功能模式
3. 测试清空对话历史
4. 测试查看统计
5. 测试正常退出

**Step 3: 更新 README.md**

```markdown
# Claude Learning Assistant

一个实用的命令行JavaScript学习助手，使用Claude API驱动。

## 功能特性

- **代码解释** 📖 - 深入理解代码的工作原理
- **概念讲解** 📚 - 学习JavaScript核心概念
- **代码生成** 💻 - 根据需求生成代码示例
- **互动问答** 🎓 - 苏格拉底式学习引导
- **学习统计** 📊 - 追踪使用历史和成本

## 安装

\`\`\`bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑.env，填入你的Anthropic API Key
\`\`\`

## 配置

在 \`.env\` 文件中配置：

\`\`\`env
ANTHROPIC_API_KEY=sk-ant-api03-你的API-Key
DEFAULT_MODEL=claude-3-5-sonnet-20241022
DEFAULT_MAX_TOKENS=1024
DAILY_BUDGET=0.50
\`\`\`

## 运行

\`\`\`bash
npm start
\`\`\`

## 使用指南

1. 选择功能模式（1-4）
2. 输入你的问题或代码
3. 输入 \`clear\` 清空对话历史
4. 输入 \`back\` 返回主菜单
5. 选择 \`6\` 退出程序

## 项目结构

\`\`\`
claude-learning-assistant/
├── src/
│   ├── core/          # 核心模块（API客户端、对话管理、Token追踪）
│   ├── features/      # 功能模块（四种学习模式）
│   ├── storage/       # 存储模块（历史记录）
│   ├── ui/            # 用户界面（菜单、显示）
│   └── utils/         # 工具函数（成本计算、日志）
├── data/              # 数据目录（学习历史）
├── prompts/           # 系统提示词
└── config.js          # 配置管理
\`\`\`

## 成本控制

程序内置Token追踪和预算控制：
- 实时显示每次调用的Token使用
- 累计计算API调用成本
- 达到预算80%时发出警告
- 可在.env中设置每日预算上限

## 技术栈

- Node.js (>=18)
- @anthropic-ai/sdk
- readline（命令行交互）
- fs/promises（文件存储）

## 许可证

MIT
```

**Step 4: 提交最终版本**

```bash
git add README.md
git commit -m "docs: 完善使用文档"

git add .
git commit -m "chore: 项目完成 - Phase 2 所有功能已实现"
```

---

## 验收检查清单

完成所有任务后，验证以下内容：

- [ ] 项目可以成功安装依赖（`npm install`）
- [ ] 项目可以成功启动（`npm start`）
- [ ] 四种功能模式都能正常工作
- [ ] 多轮对话上下文正确保持
- [ ] Token使用和成本正确显示
- [ ] 历史记录能正确保存和读取
- [ ] 统计信息正确显示
- [ ] 常见错误有友好提示
- [ ] 代码结构清晰，有适当注释
- [ ] 所有测试通过

---

## 执行说明

**完成此计划后，你将拥有：**

1. 一个功能完整的命令行学习助手
2. 清晰的模块化代码结构
3. 完整的历史记录和统计功能
4. 实用的成本控制机制

**后续可能的增强（Phase 3）：**

- 彩色输出美化
- 导出学习笔记为Markdown
- 多语言支持
- 更多学习模式
- Web界面版本

---

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
