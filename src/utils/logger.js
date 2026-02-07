// src/utils/logger.js
/** @const {number} 分隔线宽度 */
const LINE_WIDTH = 50;

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
 * 带前缀的日志输出
 */
export const Logger = {
    info(message) {
        console.log(`[INFO] ${message}`);
    },

    success(message) {
        console.log(`[SUCCESS] ${message}`);
    },

    warning(message) {
        console.log(`[WARNING] ${message}`);
    },

    // 别名，兼容性
    warn(message) {
        return this.warning(message);
    },

    error(message) {
        console.error(`[ERROR] ${message}`);
    },

    section(title) {
        const line = '━'.repeat(LINE_WIDTH);
        console.log(`\n${line}`);
        console.log(`  ${title}`);
        console.log(`${line}\n`);
    },

    divider() {
        console.log('─'.repeat(LINE_WIDTH));
    }
};
