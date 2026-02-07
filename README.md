# Claude Learning Assistant

一个实用的命令行编程学习助手，使用 Claude API 驱动。支持 JavaScript、Python、React 等多种技术栈。

## 功能特性

- **互动问答**：与 Claude 进行交互式学习和问答
- **代码解释**：深入理解代码的工作原理和设计模式
- **概念讲解**：学习编程核心概念和最佳实践
- **代码生成**：根据需求生成符合最佳实践的代码
- **历史记录**：查看使用历史和详细统计
- **预算管理**：追踪 API 使用成本，控制开销

## 安装

### 前置要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

```bash
# 克隆仓库
git clone <repository-url>
cd claude-learning-assistant

# 安装依赖
npm install
```

## 配置

1. 复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置以下参数：

```env
# 必需：Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here

# 可选：使用的 Claude 模型（默认：claude-3-5-sonnet-20241022）
DEFAULT_MODEL=claude-3-5-sonnet-20241022

# 可选：每日预算限制（美元，默认：0.50）
DAILY_BUDGET=0.50

# 可选：最大输出 tokens（默认：1024）
DEFAULT_MAX_TOKENS=1024
```

### 获取 API Key

访问 [Anthropic Console](https://console.anthropic.com/) 获取您的 API Key。

## 运行

```bash
npm start
```

## 使用说明

### 主菜单功能

启动程序后，您会看到主菜单：

- **选项 1 - 互动问答**：与 Claude 进行实时对话，提问编程问题
- **选项 2 - 代码解释**：粘贴代码获取详细解释和分析
- **选项 3 - 概念讲解**：深入学习编程概念和技术原理
- **选项 4 - 代码生成**：根据需求描述生成高质量代码
- **选项 5 - 查看历史**：查看会话历史和使用统计
- **选项 6 - 预算状态**：查看当前 API 使用成本和预算
- **选项 q - 退出**：退出程序

### 功能模块详解

#### 1. 互动问答

与 Claude 进行交互式对话，适合：
- 解答编程和技术问题
- 解释复杂的概念
- 获取学习建议和指导
- 代码审查和优化建议

**示例问题**：
- "解释 JavaScript 中的闭包概念"
- "如何优化 React 组件性能？"
- "Python 的装饰器是如何工作的？"

#### 2. 代码解释

粘贴代码片段，获取详细解释：
- 代码功能和逻辑分析
- 关键语法特性说明
- 设计模式识别
- 潜在问题和改进建议

**支持的编程语言**：JavaScript、Python、Java、TypeScript、React、Vue 等

**示例用法**：
- 直接粘贴代码片段
- "解释这段 JavaScript 代码的功能"
- "这个 React 组件使用了什么设计模式？"

#### 3. 概念讲解

深入理解编程核心概念：
- 简单易懂的概念解释
- 生活化的类比说明
- 实用的代码示例
- 常见误区和注意事项

**可调整深度**：基础、中级、高级

**示例概念**：
- 闭包、异步编程、虚拟 DOM
- 装饰器、泛型、设计模式
- 数据结构、算法、架构模式

#### 4. 代码生成

根据需求生成高质量代码：
- 符合最佳实践的代码
- 详细的注释说明
- 使用示例和文档
- 边界情况和错误处理

**示例需求**：
- "创建一个 React 登录表单组件"
- "生成一个 Python 函数来解析 JSON 文件"
- "写一个 Node.js Express 路由处理用户注册"

### 通用命令

在任意功能模块中，您可以使用以下命令：

```
/help     - 显示帮助信息
/clear    - 清除对话历史
/summary  - 查看会话摘要统计
/export   - 导出对话记录（支持 json、md、text 格式）
/exit     - 返回主菜单
```

## 成本控制

本项目内置了成本控制功能，帮助您管理 API 使用：

### 每日预算

默认设置每日预算为 $0.50，可在 `.env` 文件中调整：

```env
DAILY_BUDGET=1.00  # 设置为 $1.00
```

### 模型定价

不同模型的定价（每百万 tokens）：

| 模型 | 输入 | 输出 |
|------|------|------|
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 |
| claude-3-opus-20240229 | $15.00 | $75.00 |
| claude-3-haiku-20240307 | $0.25 | $1.25 |

### 成本优化建议

1. **使用合适的模型**：Haiku 适合简单任务，Sonnet 适合一般用途，Opus 适合复杂任务
2. **设置合理的 maxTokens**：不同功能模块有不同的默认值
3. **定期查看历史**：了解各功能的成本消耗
4. **设置预算提醒**：当接近预算时会自动提醒

## 项目结构

```
claude-learning-assistant/
├── src/
│   ├── core/                    # 核心功能模块
│   │   ├── ClaudeClient.js      # Claude API 客户端
│   │   ├── ConversationManager.js  # 对话管理器
│   │   └── TokenTracker.js      # Token 追踪器
│   ├── features/                # 功能特性模块
│   │   ├── BaseFeature.js       # 功能模块基类
│   │   ├── InteractiveTutor.js  # 互动问答
│   │   ├── CodeExplainer.js     # 代码解释
│   │   ├── ConceptTeacher.js    # 概念讲解
│   │   └── CodeGenerator.js     # 代码生成
│   ├── storage/                 # 数据存储
│   │   └── HistoryManager.js    # 历史记录管理
│   ├── ui/                      # 用户界面
│   │   ├── Display.js           # 显示模块
│   │   └── Menu.js              # 菜单模块
│   ├── utils/                   # 工具函数
│   │   ├── cost-calculator.js   # 成本计算
│   │   └── logger.js            # 日志工具
│   └── index.js                 # 主入口
├── test/                        # 测试文件
│   ├── config.test.js
│   └── storage/
│       └── history-manager.test.js
├── prompts/                     # 系统提示词模板
│   ├── tutor.txt
│   ├── code-explainer.txt
│   ├── concept-teacher.txt
│   └── code-generator.txt
├── data/                        # 运行时数据
│   └── history/                 # 历史记录存储
├── config.js                    # 配置管理
├── package.json
├── .env.example
└── README.md
```

## 测试

运行所有测试：

```bash
npm test
```

运行特定测试：

```bash
# 测试配置模块
node --test test/config.test.js

# 测试历史记录管理器
node --test test/storage/history-manager.test.js
```

## 故障排除

### 常见错误

1. **API 密钥无效**
   - 检查 `.env` 文件中的 API Key 是否正确
   - 确认 API Key 未过期
   - 访问 [Anthropic Console](https://console.anthropic.com/) 获取新的 API Key

2. **网络连接失败**
   - 检查网络连接是否正常
   - 尝试切换到不同的网络
   - 检查防火墙设置

3. **API 请求过于频繁**
   - 等待一段时间后重试
   - 检查您的 API 使用配额
   - 考虑升级到更高层级的 API 计划

4. **配置验证失败**
   - 确保 `.env` 文件存在
   - 检查必需的环境变量是否已设置
   - 验证每日预算是否为有效的正数

## 开发

### 添加新功能模块

1. 在 `src/features/` 创建新的功能类，继承 `BaseFeature`
2. 在 `prompts/` 添加对应的系统提示词文件
3. 在 `src/index.js` 中导入并注册新功能
4. 更新主菜单选项

### 修改系统提示词

编辑 `prompts/` 目录下的 `.txt` 文件，自定义各功能的行为和风格。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

- [Anthropic](https://www.anthropic.com/) - 提供 Claude API
- [chalk](https://www.npmjs.com/package/chalk) - 终端颜色输出
- [dotenv](https://www.npmjs.com/package/dotenv) - 环境变量管理
