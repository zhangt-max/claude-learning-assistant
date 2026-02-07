// src/ui/Display.js
import { Logger } from '../utils/logger.js';

/**
 * UI 显示模块
 * 提供各种静态方法用于在终端显示信息
 */
export class Display {
  /**
   * 显示标题
   * @param {string} title - 标题文本
   * @param {Object} options - 选项
   * @param {string} options.style - 标题样式 ('simple' | 'box' | 'banner')
   * @param {string} options.color - 颜色 ('red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white')
   */
  static title(title, options = {}) {
    const { style = 'box', color = 'cyan' } = options;

    const coloredTitle = Display.colorize(title, color);

    switch (style) {
      case 'simple':
        console.log(`\n${coloredTitle}\n${'='.repeat(title.length * 2)}\n`);
        break;

      case 'box':
        const boxWidth = Math.max(title.length + 8, 50);
        const padding = ' '.repeat((boxWidth - title.length - 2) / 2);
        console.log(`\n┌${'─'.repeat(boxWidth)}┐`);
        console.log(`│${padding}${coloredTitle}${padding}│`);
        console.log(`└${'─'.repeat(boxWidth)}┘\n`);
        break;

      case 'banner':
        console.log(`\n╔${'═'.repeat(title.length + 8)}╗`);
        console.log(`║    ${coloredTitle}    ║`);
        console.log(`╚${'═'.repeat(title.length + 8)}╝\n`);
        break;

      default:
        console.log(`\n${coloredTitle}\n`);
    }
  }

  /**
   * 显示信息
   * @param {string} message - 信息文本
   * @param {Object} options - 选项
   * @param {string} options.type - 信息类型 ('info' | 'success' | 'warning' | 'error')
   * @param {string} options.icon - 自定义图标
   */
  static info(message, options = {}) {
    const { type = 'info', icon } = options;

    let displayIcon;
    let color;

    switch (type) {
      case 'success':
        displayIcon = icon || '✓';
        color = 'green';
        break;
      case 'warning':
        displayIcon = icon || '⚠';
        color = 'yellow';
        break;
      case 'error':
        displayIcon = icon || '✗';
        color = 'red';
        break;
      default:
        displayIcon = icon || 'ℹ';
        color = 'blue';
    }

    const coloredMessage = Display.colorize(message, color);
    console.log(`${displayIcon}  ${coloredMessage}`);
  }

  /**
   * 显示错误
   * @param {string} message - 错误信息
   * @param {Error} [error] - 错误对象
   */
  static error(message, error = null) {
    console.log('');
    Display.info(message, { type: 'error' });

    if (error) {
      console.log(`  ${Display.colorize('详细信息:', 'red')} ${error.message}`);
      if (process.env.DEBUG && error.stack) {
        console.log(`\n${error.stack}\n`);
      }
    }
    console.log('');
  }

  /**
   * 显示成功信息
   * @param {string} message - 成功信息
   */
  static success(message) {
    Display.info(message, { type: 'success' });
  }

  /**
   * 显示警告信息
   * @param {string} message - 警告信息
   */
  static warning(message) {
    Display.info(message, { type: 'warning' });
  }

  /**
   * 显示分隔线
   * @param {Object} options - 选项
   * @param {string} options.style - 分隔线样式 ('simple' | 'dashed' | 'dotted')
   * @param {number} options.width - 分隔线宽度
   */
  static separator(options = {}) {
    const { style = 'simple', width = 60 } = options;

    let line;
    switch (style) {
      case 'dashed':
        line = '─'.repeat(width);
        break;
      case 'dotted':
        line = '┄'.repeat(width);
        break;
      default:
        line = '─'.repeat(width);
    }

    console.log(`\n${line}\n`);
  }

  /**
   * 显示列表
   * @param {Array<string>} items - 列表项
   * @param {Object} options - 选项
   * @param {string} options.style - 列表样式 ('bullet' | 'numbered' | 'checked')
   */
  static list(items, options = {}) {
    const { style = 'bullet' } = options;

    console.log('');

    items.forEach((item, index) => {
      let prefix;

      switch (style) {
        case 'numbered':
          prefix = `${index + 1}.`;
          break;
        case 'checked':
          prefix = '☑';
          break;
        default:
          prefix = '•';
      }

      console.log(`  ${prefix} ${item}`);
    });

    console.log('');
  }

  /**
   * 显示表格
   * @param {Array<Object>} data - 表格数据
   * @param {Array<string>} columns - 列名
   */
  static table(data, columns) {
    if (!data || data.length === 0) {
      console.log('  (空表格)');
      return;
    }

    // 计算每列的最大宽度
    const widths = columns.map(col => {
      const maxWidth = col.length;
      const dataWidth = Math.max(...data.map(row => {
        const value = String(row[col] || '');
        return value.length;
      }));
      return Math.max(maxWidth, dataWidth);
    });

    // 显示表头
    console.log('');
    let header = '  │';
    let separator = '  ├';

    columns.forEach((col, i) => {
      const padded = col.padEnd(widths[i]);
      header += ` ${padded} │`;
      separator += '─'.repeat(widths[i] + 2) + '┼';
    });

    separator = separator.slice(0, -1) + '┤';

    console.log(header);
    console.log(separator);

    // 显示数据行
    data.forEach(row => {
      let rowStr = '  │';
      columns.forEach((col, i) => {
        const value = String(row[col] || '');
        const padded = value.padEnd(widths[i]);
        rowStr += ` ${padded} │`;
      });
      console.log(rowStr);
    });

    console.log('');
  }

  /**
   * 显示代码块
   * @param {string} code - 代码内容
   * @param {string} [language] - 编程语言
   */
  static code(code, language = '') {
    console.log('');
    if (language) {
      console.log(`  ${Display.colorize(language, 'cyan')}:`);
    }
    console.log('  ┌' + '─'.repeat(Math.min(code.split('\n')[0].length + 4, 76)) + '┐');

    code.split('\n').forEach(line => {
      console.log(`  │ ${line.padEnd(76).slice(0, 76)} │`);
    });

    console.log('  └' + '─'.repeat(76) + '┘');
    console.log('');
  }

  /**
   * 显示进度条
   * @param {number} current - 当前进度
   * @param {number} total - 总数
   * @param {string} [label] - 标签
   */
  static progress(current, total, label = '') {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 40);
    const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);

    process.stdout.write(`\r${label} [${bar}] ${percentage}%`);

    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * 清屏
   */
  static clear() {
    console.clear();
  }

  /**
   * 显示欢迎消息
   * @param {string} appName - 应用名称
   * @param {string} version - 版本号
   */
  static welcome(appName, version) {
    console.clear();
    Display.title(appName, { style: 'banner' });
    console.log(`  版本: ${Display.colorize(version, 'green')}`);
    console.log(`  作者: Claude Learning Assistant`);
    Display.separator();
  }

  /**
   * 确认对话框
   * @param {string} question - 问题文本
   * @param {Object} options - 选项
   * @param {boolean} options.default - 默认值
   * @returns {boolean} 用户选择
   */
  static confirm(question, options = {}) {
    const { default: defaultValue = false } = options;
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const prompt = `${question} [${defaultText}]: `;

    process.stdout.write(prompt);

    // 这个方法需要与 readline 模块配合使用
    // 这里只是定义接口
    return defaultValue;
  }

  /**
   * 颜色化文本
   * @private
   * @param {string} text - 要着色的文本
   * @param {string} color - 颜色名称
   * @returns {string} 着色后的文本（带 ANSI 代码）
   */
  static colorize(text, color) {
    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };

    const colorCode = colors[color] || colors.white;
    return `${colorCode}${text}${colors.reset}`;
  }

  /**
   * 显示提示符
   * @param {string} [prompt] - 提示符文本
   */
  static prompt(prompt = '> ') {
    process.stdout.write(`\n${Display.colorize(prompt, 'green')}`);
  }

  /**
   * 显示多行文本
   * @param {string} text - 文本内容
   * @param {Object} options - 选项
   * @param {number} options.width - 文本宽度
   * @param {string} options.indent - 缩进
   */
  static text(text, options = {}) {
    const { width = 80, indent = '' } = options;

    console.log('');
    text.split('\n').forEach(line => {
      console.log(`${indent}${line}`);
    });
    console.log('');
  }

  /**
   * 显示键值对
   * @param {Object} data - 键值对数据
   */
  static keyValue(data) {
    console.log('');
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      const coloredKey = Display.colorize(paddedKey, 'cyan');
      console.log(`  ${coloredKey}: ${value}`);
    });

    console.log('');
  }

  /**
   * 显示菜单项
   * @param {Array<{key: string, label: string, description: string}>} items - 菜单项
   */
  static menuItems(items) {
    console.log('');

    items.forEach(item => {
      const key = Display.colorize(item.key.padEnd(4), 'green');
      const label = Display.colorize(item.label, 'white');
      const desc = item.description ? Display.colorize(` - ${item.description}`, 'dim') : '';
      console.log(`  ${key} ${label}${desc}`);
    });

    console.log('');
  }
}
