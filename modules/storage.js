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
        try {
            // 策略1：清理包含 base64 图片的拍卖品（base64 图片非常大）
            const auctions = storage.get(STORAGE_KEYS.AUCTIONS, []);
            const cleanedAuctions = auctions.map(auction => {
                // 如果图片是 base64 格式（以 data:image 开头），替换为轻量级 SVG 占位符
                if (auction.image && auction.image.startsWith('data:image')) {
                    const title = (auction.title || 'Image').substring(0, 20);
                    // 使用内联 SVG data URI，不依赖外部服务，体积小
                    const svgText = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f0f0f0"/><text x="400" y="300" font-family="Arial,sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle">${title}</text></svg>`;
                    const svgPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
                    return {
                        ...auction,
                        image: svgPlaceholder
                    };
                }
                return auction;
            });
            if (cleanedAuctions.length > 0) {
                try {
                    storage.set(STORAGE_KEYS.AUCTIONS, cleanedAuctions, true);
                    console.log('已清理 base64 图片数据');
                } catch (e) {
                    // 如果还是不够，清理历史记录
                }
            }
            
            // 策略2：清理历史记录（保留最近30条）
            const history = storage.get(STORAGE_KEYS.AUCTION_HISTORY, []);
            if (history.length > 30) {
                history.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
                const cleanedHistory = history.slice(0, 30);
                try {
                    storage.set(STORAGE_KEYS.AUCTION_HISTORY, cleanedHistory, true);
                    console.log(`已清理历史记录：${history.length} -> ${cleanedHistory.length}`);
                } catch (e) {
                    // 继续清理
                }
            }
            
            // 策略3：清理用户数据（保留最近50个）
            const users = storage.get(STORAGE_KEYS.USERS, []);
            if (users.length > 50) {
                const cleanedUsers = users.slice(0, 50);
                try {
                    storage.set(STORAGE_KEYS.USERS, cleanedUsers, true);
                    console.log(`已清理用户数据：${users.length} -> ${cleanedUsers.length}`);
                } catch (e) {
                    // 最后手段：清除所有数据
                    console.warn('存储空间严重不足，建议清除所有数据');
                }
            }
        } catch (error) {
            console.error('清理数据失败:', error);
        }
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
 * 清理 via.placeholder.com 链接，替换为 SVG 占位符
 * @param {Array} auctions - 拍卖品数组
 * @returns {Array} 清理后的拍卖品数组
 */
function cleanPlaceholderImages(auctions) {
    if (!Array.isArray(auctions)) return auctions;
    
    let hasChanges = false;
    const cleaned = auctions.map(auction => {
        if (auction.image && auction.image.includes('via.placeholder.com')) {
            hasChanges = true;
            const title = (auction.title || 'Image').substring(0, 20);
            const svgText = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f0f0f0"/><text x="400" y="300" font-family="Arial,sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle">${title}</text></svg>`;
            return {
                ...auction,
                image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
            };
        }
        return auction;
    });
    
    // 如果有变化，自动保存
    if (hasChanges) {
        storage.set(STORAGE_KEYS.AUCTIONS, cleaned, true);
    }
    
    return cleaned;
}

/**
 * 拍卖品存储操作
 */
export const auctionStorage = {
    /**
     * 获取所有拍卖品
     * @returns {Array} 拍卖品数组
     */
    getAuctions() {
        const auctions = storage.get(STORAGE_KEYS.AUCTIONS, []);
        // 自动清理 via.placeholder.com 链接
        return cleanPlaceholderImages(auctions);
    },

    /**
     * 保存拍卖品
     * @param {Array} auctions - 拍卖品数组
     * @param {boolean} immediate - 是否立即保存
     * @param {{source?: 'local'|'cloud'}} options - 保存来源：local 表示本地变更（会尝试同步云端）；cloud 表示云端下发（仅落本地，避免回写循环）
     */
    async saveAuctions(auctions, immediate = false, options = {}) {
        const source = options.source || 'local';

        // 云端下发：只落本地，避免 onValue -> save -> set -> onValue 的循环
        if (source === 'cloud') {
            storage.set(STORAGE_KEYS.AUCTIONS, auctions, true);
            return;
        }

        // 本地变更：先落本地（支持离线/兜底）
        storage.set(STORAGE_KEYS.AUCTIONS, auctions, immediate);

        // 尝试同步云端（不阻塞主流程）
        try {
            const { saveAuctionsToCloud, isCloudStorageAvailable } = await import('./cloudStorage.js');
            if (isCloudStorageAvailable()) {
                saveAuctionsToCloud(auctions).catch(() => {});
            }
        } catch (_) {
            // 静默失败：云存储不可用不影响本地
        }
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
        const history = storage.get(STORAGE_KEYS.AUCTION_HISTORY, []);
        // 自动清理 via.placeholder.com 链接
        return cleanPlaceholderImages(history);
    },

    /**
     * 保存历史记录
     * @param {Array} history - 历史记录数组
     * @param {boolean} immediate - 是否立即保存
     * @param {{source?: 'local'|'cloud'}} options - 保存来源：local 表示本地变更（会尝试同步云端）；cloud 表示云端下发（仅落本地，避免回写循环）
     */
    saveHistory(history, immediate = false, options = {}) {
        const source = options.source || 'local';

        if (source === 'cloud') {
            storage.set(STORAGE_KEYS.AUCTION_HISTORY, history, true);
            return;
        }

        storage.set(STORAGE_KEYS.AUCTION_HISTORY, history, immediate);

        // 尝试同步云端（不阻塞）
        import('./cloudStorage.js')
            .then(({ saveHistoryToCloud, isCloudStorageAvailable }) => {
                if (isCloudStorageAvailable()) {
                    saveHistoryToCloud(history).catch(() => {});
                }
            })
            .catch(() => {});
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
            // 尝试同步云端（不阻塞）
            import('./cloudStorage.js')
                .then(({ saveUsersToCloud, isCloudStorageAvailable }) => {
                    if (isCloudStorageAvailable()) {
                        saveUsersToCloud(users).catch(() => {});
                    }
                })
                .catch(() => {});
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

