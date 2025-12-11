/**
 * 状态管理模块
 * 管理应用的全局状态
 */

import { ACHIEVEMENTS, ADMIN_CONFIG } from './constants.js';

/**
 * 应用状态管理器
 */
class AppStateManager {
    constructor() {
        this.state = {
            currentUser: null,
            auctions: [],
            auctionHistory: [],
            timers: {},
            currentRegistrationAuction: null,
            achievements: ACHIEVEMENTS.map(a => ({ ...a })),
            adminUsers: [...ADMIN_CONFIG.ADMIN_USERS]
        };

        // 状态变更监听器
        this.listeners = new Map();
    }

    /**
     * 获取状态
     * @param {string} key - 状态键名
     * @returns {*} 状态值
     */
    get(key) {
        return this.state[key];
    }

    /**
     * 设置状态
     * @param {string} key - 状态键名
     * @param {*} value - 状态值
     * @param {boolean} notify - 是否通知监听器
     */
    set(key, value, notify = true) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (notify && this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(value, oldValue);
            });
        }
    }

    /**
     * 更新状态（部分更新）
     * @param {string} key - 状态键名
     * @param {Object} updates - 要更新的属性
     */
    update(key, updates) {
        if (typeof this.state[key] === 'object' && this.state[key] !== null) {
            this.state[key] = { ...this.state[key], ...updates };
            
            if (this.listeners.has(key)) {
                this.listeners.get(key).forEach(callback => {
                    callback(this.state[key]);
                });
            }
        }
    }

    /**
     * 订阅状态变更
     * @param {string} key - 状态键名
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅的函数
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        // 返回取消订阅函数
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * 重置状态
     */
    reset() {
        this.state = {
            currentUser: null,
            auctions: [],
            auctionHistory: [],
            timers: {},
            currentRegistrationAuction: null,
            achievements: ACHIEVEMENTS.map(a => ({ ...a })),
            adminUsers: [...ADMIN_CONFIG.ADMIN_USERS]
        };
        this.listeners.clear();
    }
}

// 创建单例实例
const appState = new AppStateManager();

// 导出便捷方法
export const getState = (key) => appState.get(key);
export const setState = (key, value, notify) => appState.set(key, value, notify);
export const updateState = (key, updates) => appState.update(key, updates);
export const subscribeState = (key, callback) => appState.subscribe(key, callback);

// 导出状态访问器（保持向后兼容）
// 使用函数返回Proxy，确保每次访问都是最新的状态
export const AppState = new Proxy({}, {
    get(target, prop) {
        return appState.get(prop);
    },
    set(target, prop, value) {
        appState.set(prop, value);
        return true;
    }
});

export default appState;

