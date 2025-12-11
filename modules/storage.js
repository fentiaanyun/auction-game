/**
 * 存储模块
 * 封装localStorage操作，提供统一的数据存储接口
 */

import { STORAGE_KEYS } from './constants.js';
import { safeJsonParse, debounce } from './utils.js';
import { UI_CONFIG } from './constants.js';

/**
 * 存储管理器
 */
class StorageManager {
    constructor() {
        // 使用防抖优化频繁写入
        this.debouncedSave = debounce(this._save.bind(this), UI_CONFIG.DEBOUNCE_DELAY);
        this.cache = new Map(); // 内存缓存
    }

    /**
     * 内部保存方法（实际执行保存）
     * @private
     */
    _save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.cache.set(key, data);
        } catch (error) {
            console.error(`保存数据失败 [${key}]:`, error);
            // 如果存储空间不足，尝试清理旧数据
            if (error.name === 'QuotaExceededError') {
                this._handleQuotaExceeded();
            }
        }
    }

    /**
     * 处理存储空间不足
     * @private
     */
    _handleQuotaExceeded() {
        console.warn('存储空间不足，尝试清理旧数据...');
        // 可以在这里实现清理策略，比如删除最旧的历史记录
    }

    /**
     * 获取数据（带缓存）
     * @param {string} key - 存储键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 存储的数据或默认值
     */
    get(key, defaultValue = null) {
        // 先检查缓存
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // 从localStorage读取
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }

        const data = safeJsonParse(item, defaultValue);
        // 更新缓存
        this.cache.set(key, data);
        return data;
    }

    /**
     * 保存数据（使用防抖）
     * @param {string} key - 存储键名
     * @param {*} data - 要保存的数据
     * @param {boolean} immediate - 是否立即保存（不使用防抖）
     */
    set(key, data, immediate = false) {
        if (immediate) {
            this._save(key, data);
        } else {
            this.debouncedSave(key, data);
        }
    }

    /**
     * 删除数据
     * @param {string} key - 存储键名
     */
    remove(key) {
        localStorage.removeItem(key);
        this.cache.delete(key);
    }

    /**
     * 清空所有数据
     */
    clear() {
        localStorage.clear();
        this.cache.clear();
    }

    /**
     * 检查键是否存在
     * @param {string} key - 存储键名
     * @returns {boolean} 是否存在
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    }
}

// 创建单例实例
const storage = new StorageManager();

/**
 * 拍卖品存储操作
 */
export const auctionStorage = {
    /**
     * 获取所有拍卖品
     * @returns {Array} 拍卖品数组
     */
    getAuctions() {
        return storage.get(STORAGE_KEYS.AUCTIONS, []);
    },

    /**
     * 保存拍卖品
     * @param {Array} auctions - 拍卖品数组
     * @param {boolean} immediate - 是否立即保存
     */
    saveAuctions(auctions, immediate = false) {
        storage.set(STORAGE_KEYS.AUCTIONS, auctions, immediate);
    }
};

/**
 * 历史记录存储操作
 */
export const historyStorage = {
    /**
     * 获取历史记录
     * @returns {Array} 历史记录数组
     */
    getHistory() {
        return storage.get(STORAGE_KEYS.AUCTION_HISTORY, []);
    },

    /**
     * 保存历史记录
     * @param {Array} history - 历史记录数组
     * @param {boolean} immediate - 是否立即保存
     */
    saveHistory(history, immediate = false) {
        storage.set(STORAGE_KEYS.AUCTION_HISTORY, history, immediate);
    }
};

/**
 * 用户存储操作
 */
export const userStorage = {
    /**
     * 获取所有用户
     * @returns {Array} 用户数组
     */
    getUsers() {
        return storage.get(STORAGE_KEYS.USERS, []);
    },

    /**
     * 获取指定用户
     * @param {string} username - 用户名
     * @returns {Object|null} 用户对象或null
     */
    getUser(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username) || null;
    },

    /**
     * 保存用户
     * @param {Object} user - 用户对象
     * @param {boolean} immediate - 是否立即保存
     */
    saveUser(user, immediate = true) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.username === user.username);
        
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        
        storage.set(STORAGE_KEYS.USERS, users, immediate);
        
        // 保存最后登录用户
        if (immediate) {
            storage.set(STORAGE_KEYS.LAST_USER, user.username, true);
        }
    },

    /**
     * 获取最后登录用户
     * @returns {string|null} 用户名或null
     */
    getLastUser() {
        return storage.get(STORAGE_KEYS.LAST_USER, null);
    }
};

/**
 * 设置存储操作
 */
export const settingsStorage = {
    /**
     * 获取网站设置
     * @returns {Object|null} 设置对象或null
     */
    getSettings() {
        const settings = storage.get(STORAGE_KEYS.SITE_SETTINGS);
        if (typeof settings === 'string') {
            return safeJsonParse(settings, null);
        }
        return settings;
    },

    /**
     * 保存网站设置
     * @param {Object} settings - 设置对象
     * @param {boolean} immediate - 是否立即保存
     */
    saveSettings(settings, immediate = true) {
        storage.set(STORAGE_KEYS.SITE_SETTINGS, settings, immediate);
    }
};

// 导出存储管理器实例（用于高级操作）
export default storage;

