/**
 * 定时器管理模块
 * 统一管理所有定时器，避免内存泄漏
 */

/**
 * 定时器管理器
 */
class TimerManager {
    constructor() {
        this.timers = new Map();
        this.intervals = new Map();
        this.timeouts = new Map();
    }

    /**
     * 添加定时器（setTimeout）
     * @param {string} id - 定时器ID
     * @param {Function} callback - 回调函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {number} 定时器ID
     */
    setTimeout(id, callback, delay) {
        this.clearTimeout(id);
        const timerId = window.setTimeout(() => {
            callback();
            this.timeouts.delete(id);
        }, delay);
        this.timeouts.set(id, timerId);
        return timerId;
    }

    /**
     * 添加间隔定时器（setInterval）
     * @param {string} id - 定时器ID
     * @param {Function} callback - 回调函数
     * @param {number} interval - 间隔时间（毫秒）
     * @returns {number} 定时器ID
     */
    setInterval(id, callback, interval) {
        this.clearInterval(id);
        const timerId = window.setInterval(callback, interval);
        this.intervals.set(id, timerId);
        return timerId;
    }

    /**
     * 清除定时器（setTimeout）
     * @param {string} id - 定时器ID
     */
    clearTimeout(id) {
        if (this.timeouts.has(id)) {
            window.clearTimeout(this.timeouts.get(id));
            this.timeouts.delete(id);
        }
    }

    /**
     * 清除间隔定时器（setInterval）
     * @param {string} id - 定时器ID
     */
    clearInterval(id) {
        if (this.intervals.has(id)) {
            window.clearInterval(this.intervals.get(id));
            this.intervals.delete(id);
        }
    }

    /**
     * 清除所有定时器
     */
    clearAll() {
        // 清除所有setTimeout
        this.timeouts.forEach(timerId => {
            window.clearTimeout(timerId);
        });
        this.timeouts.clear();

        // 清除所有setInterval
        this.intervals.forEach(timerId => {
            window.clearInterval(timerId);
        });
        this.intervals.clear();

        // 清除所有通用定时器
        this.timers.forEach(timerId => {
            if (typeof timerId === 'number') {
                window.clearTimeout(timerId);
            }
        });
        this.timers.clear();
    }

    /**
     * 检查定时器是否存在
     * @param {string} id - 定时器ID
     * @returns {boolean} 是否存在
     */
    has(id) {
        return this.timeouts.has(id) || this.intervals.has(id) || this.timers.has(id);
    }

    /**
     * 获取所有活动的定时器数量
     * @returns {number} 定时器数量
     */
    getCount() {
        return this.timeouts.size + this.intervals.size + this.timers.size;
    }
}

// 创建单例实例
const timerManager = new TimerManager();

// 页面卸载时清理所有定时器
window.addEventListener('beforeunload', () => {
    timerManager.clearAll();
});

// 导出便捷方法
export const setTimeout = (id, callback, delay) => timerManager.setTimeout(id, callback, delay);
export const setInterval = (id, callback, interval) => timerManager.setInterval(id, callback, interval);
export const clearTimeout = (id) => timerManager.clearTimeout(id);
export const clearInterval = (id) => timerManager.clearInterval(id);
export const clearAllTimers = () => timerManager.clearAll();

export default timerManager;

