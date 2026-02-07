// src/ui/Menu.js
import readline from 'readline';
import { Display } from './Display.js';
import { Logger } from '../utils/logger.js';

/**
 * 菜单处理模块
 * 提供各种菜单相关的静态方法
 */
export class Menu {
  /**
   * 显示主菜单并获取用户选择
   * @param {Array<{key: string, label: string, description: string, action: Function}>} options - 菜单选项
   * @param {Object} config - 配置
   * @param {string} config.title - 菜单标题
   * @param {string} config.prompt - 提示符
   * @param {boolean} config.loop - 是否循环显示
   * @returns {Promise<string>} 用户选择的键
   */
  static async show(options, config = {}) {
    const {
      title = '主菜单',
      prompt = '请选择',
      loop = false
    } = config;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      let shouldContinue = true;
      let selectedKey = null;

      while (shouldContinue) {
        // 显示标题
        Display.title(title, { style: 'box' });

        // 显示菜单选项
        Display.menuItems(options);

        // 显示提示符
        const answer = await Menu.question(rl, `${Display.colorize(prompt, 'green')} `);

        // 处理用户输入
        const selected = options.find(opt => opt.key === answer.toLowerCase());

        if (selected) {
          selectedKey = selected.key;

          // 执行对应的操作
          if (selected.action) {
            await selected.action();
          }

          if (!loop) {
            shouldContinue = false;
          } else {
            // 询问是否继续
            const continueAnswer = await Menu.question(rl, '\n是否继续? (y/N): ');
            if (continueAnswer.toLowerCase() !== 'y') {
              shouldContinue = false;
            }
          }
        } else if (answer === 'q' || answer === 'quit' || answer === 'exit') {
          shouldContinue = false;
        } else {
          Display.warning(`无效的选择: ${answer}`);
        }
      }

      return selectedKey;

    } finally {
      rl.close();
    }
  }

  /**
   * 显示确认对话框
   * @param {string} question - 确认问题
   * @param {Object} options - 选项
   * @param {boolean} options.default - 默认值
   * @returns {Promise<boolean>} 用户确认结果
   */
  static async confirm(question, options = {}) {
    const { default: defaultValue = false } = options;
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const prompt = `${question} [${defaultText}]: `;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const answer = await Menu.question(rl, prompt);

      if (answer === '') {
        return defaultValue;
      }

      return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
    } finally {
      rl.close();
    }
  }

  /**
   * 显示输入对话框
   * @param {string} prompt - 提示文本
   * @param {Object} options - 选项
   * @param {string} options.default - 默认值
   * @param {boolean} options.required - 是否必填
   * @returns {Promise<string>} 用户输入
   */
  static async input(prompt, options = {}) {
    const { default: defaultValue = '', required = false } = options;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      let fullPrompt = prompt;
      if (defaultValue) {
        fullPrompt += ` [${defaultValue}]: `;
      } else {
        fullPrompt += ': ';
      }

      let answer = await Menu.question(rl, fullPrompt);

      if (!answer && defaultValue) {
        answer = defaultValue;
      }

      if (required && !answer) {
        Display.warning('此项为必填项，请输入。');
        return Menu.input(prompt, options);
      }

      return answer;
    } finally {
      rl.close();
    }
  }

  /**
   * 显示选择对话框
   * @param {string} prompt - 提示文本
   * @param {Array<string>} choices - 选项列表
   * @param {Object} options - 配置选项
   * @param {number} options.default - 默认选择的索引
   * @returns {Promise<string>} 用户选择的值
   */
  static async select(prompt, choices, options = {}) {
    const { default: defaultIndex = 0 } = options;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('');
      console.log(`${prompt}`);
      console.log('');

      choices.forEach((choice, index) => {
        const prefix = index === defaultIndex ? '>' : ' ';
        const coloredPrefix = index === defaultIndex ? Display.colorize(prefix, 'green') : prefix;
        console.log(`  ${coloredPrefix} ${index + 1}. ${choice}`);
      });

      console.log('');

      const answer = await Menu.question(rl, Display.colorize('请输入序号', 'green') + ` [${defaultIndex + 1}]: `);

      let index = parseInt(answer) - 1;

      if (isNaN(index) || answer === '') {
        index = defaultIndex;
      }

      if (index < 0 || index >= choices.length) {
        Display.warning(`无效的选择，请输入 1-${choices.length} 之间的数字。`);
        return Menu.select(prompt, choices, options);
      }

      return choices[index];
    } finally {
      rl.close();
    }
  }

  /**
   * 显示多选对话框
   * @param {string} prompt - 提示文本
   * @param {Array<string>} choices - 选项列表
   * @returns {Promise<Array<string>>} 用户选择的值数组
   */
  static async multiSelect(prompt, choices) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      console.log('');
      console.log(`${prompt}`);
      console.log('');

      choices.forEach((choice, index) => {
        console.log(`  [ ] ${index + 1}. ${choice}`);
      });

      console.log('');
      console.log('提示: 输入序号，多个选项用逗号分隔（如: 1,3,5）');

      const answer = await Menu.question(rl, Display.colorize('请选择', 'green') + ': ');

      if (!answer.trim()) {
        return [];
      }

      const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);
      const selected = [];

      for (const index of indices) {
        if (index >= 0 && index < choices.length) {
          selected.push(choices[index]);
        }
      }

      return selected;
    } finally {
      rl.close();
    }
  }

  /**
   * 显示密码输入对话框
   * @param {string} prompt - 提示文本
   * @returns {Promise<string>} 用户输入的密码
   */
  static async password(prompt = '密码: ') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 禁用回显
    rl._writeToOutput = function(string) {
      if (string === '\n' || string === '\r') {
        rl.output.write('\n');
      } else {
        rl.output.write('*');
      }
    };

    try {
      return await Menu.question(rl, prompt);
    } finally {
      rl.close();
    }
  }

  /**
   * 内部问题方法
   * @private
   * @param {readline.Interface} rl - readline 接口
   * @param {string} prompt - 提示文本
   * @returns {Promise<string>} 用户输入
   */
  static question(rl, prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * 显示交互式菜单
   * @param {Object} config - 配置
   * @param {string} config.title - 标题
   * @param {string} config.subtitle - 副标题
   * @param {Array<Object>} config.items - 菜单项
   * @returns {Promise<void>}
   */
  static async interactive(config) {
    const { title, subtitle, items } = config;

    let running = true;

    while (running) {
      Display.clear();

      if (title) {
        Display.title(title, { style: 'banner' });
      }

      if (subtitle) {
        console.log(`  ${subtitle}\n`);
      }

      Display.separator();

      // 显示菜单项
      items.forEach((item, index) => {
        const key = Display.colorize(`[${item.key}]`, 'green');
        const label = Display.colorize(item.label, 'white');
        const desc = item.description ? ` - ${Display.colorize(item.description, 'dim')}` : '';
        console.log(`  ${key} ${label}${desc}`);
      });

      Display.separator();

      // 获取用户输入
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      try {
        const answer = await Menu.question(rl, Display.colorize('请选择', 'green') + ': ');

        const selectedItem = items.find(item => item.key === answer.toLowerCase());

        if (selectedItem) {
          if (selectedItem.action) {
            await selectedItem.action();
          }

          if (selectedItem.exit !== false) {
            // 询问是否返回菜单
            const goBack = await Menu.confirm('\n是否返回菜单?', { default: true });
            if (!goBack) {
              running = false;
            }
          }
        } else if (answer === 'q' || answer === 'quit' || answer === 'exit') {
          running = false;
        } else {
          Display.warning(`无效的选择: ${answer}`);
          await Menu.sleep(1500);
        }
      } finally {
        rl.close();
      }
    }
  }

  /**
   * 显示进度菜单
   * @param {Array<{label: string, action: Function}>} tasks - 任务列表
   * @returns {Promise<void>}
   */
  static async progress(tasks) {
    console.log('');

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const prefix = `[${i + 1}/${tasks.length}]`;

      process.stdout.write(`\r${Display.colorize(prefix, 'cyan')} ${task.label}...`);

      try {
        await task.action();
        process.stdout.write(`\r${Display.colorize(prefix, 'cyan')} ${Display.colorize('✓', 'green')} ${task.label}\n`);
      } catch (error) {
        process.stdout.write(`\r${Display.colorize(prefix, 'cyan')} ${Display.colorize('✗', 'red')} ${task.label}\n`);
        Logger.error(`任务失败: ${task.label}`, { error: error.message });
      }
    }

    console.log('\n');
  }

  /**
   * 延迟函数
   * @private
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 显示帮助菜单
   * @param {Object} config - 配置
   * @param {string} config.title - 标题
   * @param {Array<{command: string, description: string}>} config.commands - 命令列表
   */
  static help(config) {
    const { title = '帮助', commands } = config;

    Display.title(title, { style: 'box' });

    const maxCommandLength = Math.max(...commands.map(c => c.command.length));

    commands.forEach(({ command, description }) => {
      const paddedCommand = command.padEnd(maxCommandLength);
      const coloredCommand = Display.colorize(paddedCommand, 'green');
      console.log(`  ${coloredCommand}  ${description}`);
    });

    console.log('');
  }

  /**
   * 显示面包屑导航
   * @param {Array<string>} items - 导航项
   */
  static breadcrumb(items) {
    const separator = Display.colorize(' › ', 'dim');
    const breadcrumb = items.map((item, index) => {
      if (index === items.length - 1) {
        return Display.colorize(item, 'white');
      }
      return Display.colorize(item, 'cyan');
    }).join(separator);

    console.log(`\n  ${breadcrumb}\n`);
  }

  /**
   * 显示状态指示器
   * @param {string} status - 状态 ('loading' | 'success' | 'error' | 'warning')
   * @param {string} message - 消息文本
   */
  static status(status, message) {
    const icons = {
      loading: '⠋',
      success: '✓',
      error: '✗',
      warning: '⚠'
    };

    const colors = {
      loading: 'blue',
      success: 'green',
      error: 'red',
      warning: 'yellow'
    };

    const icon = icons[status] || '•';
    const color = colors[status] || 'white';

    console.log(`  ${Display.colorize(icon, color)} ${message}`);
  }
}
