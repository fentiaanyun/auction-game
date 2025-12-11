/**
 * 日志模块
 * 统一的日志管理，开发环境启用调试日志，生产环境禁用
 */

/**
 * 日志级别
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * 当前日志级别（可通过环境变量或配置修改）
 */
let currentLevel = LOG_LEVELS.DEBUG;

/**
 * 检查是否应该输出日志
 * @param {number} level - 日志级别
 * @returns {boolean} 是否应该输出
 */
function shouldLog(level) {
    return level >= currentLevel;
}

/**
 * 日志管理器
 */
class Logger {
    /**
     * 设置日志级别
     * @param {number} level - 日志级别
     */
    setLevel(level) {
        currentLevel = level;
    }

    /**
     * 调试日志（仅在开发环境显示）
     * @param {...any} args - 日志参数
     */
    debug(...args) {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.log('[DEBUG]', ...args);
        }
    }

    /**
     * 信息日志
     * @param {...any} args - 日志参数
     */
    info(...args) {
        if (shouldLog(LOG_LEVELS.INFO)) {
            console.log('[INFO]', ...args);
        }
    }

    /**
     * 警告日志
     * @param {...any} args - 日志参数
     */
    warn(...args) {
        if (shouldLog(LOG_LEVELS.WARN)) {
            console.warn('[WARN]', ...args);
        }
    }

    /**
     * 错误日志（始终显示）
     * @param {...any} args - 日志参数
     */
    error(...args) {
        if (shouldLog(LOG_LEVELS.ERROR)) {
            // 检查是否是测试日志（避免误解）
            const isTestLog = args.some(arg => 
                typeof arg === 'string' && arg.includes('[测试]')
            );
            
            if (isTestLog) {
                // 测试日志使用info级别输出，避免红色错误样式
                console.info('[ERROR]', ...args, '⚠️ 这是测试日志，不是真正的错误');
            } else {
                console.error('[ERROR]', ...args);
                // 这里可以添加错误上报逻辑
                // errorTracker.report(...args);
            }
        }
    }

    /**
     * 分组日志
     * @param {string} label - 分组标签
     * @param {Function} callback - 回调函数
     */
    group(label, callback) {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.group(label);
            callback();
            console.groupEnd();
        } else {
            callback();
        }
    }

    /**
     * 表格日志
     * @param {Array|Object} data - 表格数据
     */
    table(data) {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.table(data);
        }
    }
}

// 创建单例实例
const logger = new Logger();

// 导出便捷方法
export const debug = (...args) => logger.debug(...args);
export const info = (...args) => logger.info(...args);
export const warn = (...args) => logger.warn(...args);
export const error = (...args) => logger.error(...args);
export const group = (label, callback) => logger.group(label, callback);
export const table = (data) => logger.table(data);
export const setLogLevel = (level) => logger.setLevel(level);

// 导出日志级别常量
export { LOG_LEVELS };

export default logger;

