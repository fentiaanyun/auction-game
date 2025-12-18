/**
 * 云存储模块
 * 使用 Firebase Realtime Database 实现跨设备数据同步
 */

import { STORAGE_KEYS } from './constants.js';
import storage, { auctionStorage, historyStorage } from './storage.js';
import { setState } from './state.js';
import logger from './logger.js';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onValue, set as dbSet, get as dbGet } from 'firebase/database';

let firebaseApp = null;
let database = null;
let auth = null;
let isInitialized = false;

function getFirebaseConfigFromEnv() {
    // Vite 环境变量：只会暴露以 VITE_ 开头的变量
    return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
}

function isFirebaseConfigValid(config) {
    return Boolean(
        config &&
        config.apiKey &&
        config.authDomain &&
        config.databaseURL &&
        config.projectId &&
        config.appId
    );
}

/**
 * 初始化 Firebase
 */
export async function initCloudStorage() {
    if (isInitialized) {
        return true;
    }

    try {
        const config = getFirebaseConfigFromEnv();
        if (!isFirebaseConfigValid(config)) {
            logger.warn('Firebase 配置缺失（请配置 .env.local），使用本地存储');
            return false;
        }

        // 初始化 App（避免重复初始化）
        firebaseApp = getApps().length ? getApp() : initializeApp(config);
        auth = getAuth(firebaseApp);
        database = getDatabase(firebaseApp);

        // 匿名登录：用于配合 rules 里 auth != null（弱隔离，适合 demo）
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
        } catch (e) {
            logger.warn('匿名登录失败，使用本地存储', e?.message || e);
            return false;
        }

        isInitialized = true;

        // 设置监听器，实现实时同步
        setupRealtimeListeners();

        logger.info('云存储初始化成功（Realtime Database + Anonymous Auth）');
        return true;
    } catch (error) {
        logger.error('云存储初始化失败:', error);
        return false;
    }
}

/**
 * 设置实时监听器
 */
function setupRealtimeListeners() {
    try {
        // 监听拍卖品数据变化
        onValue(ref(database, 'auctions'), (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // 如果数据是数组，直接使用；如果是对象，转换为数组
            let auctions = Array.isArray(data) ? data : Object.values(data);

            // 确保必要字段 + 清理占位符链接
            auctions = auctions.map(auction => {
                if (!auction.registeredUsers) auction.registeredUsers = [];
                if (!auction.bidHistory) auction.bidHistory = [];
                if (!auction.likes) auction.likes = [];
                if (auction.likesCount === undefined) {
                    auction.likesCount = auction.likes.length;
                }
                if (auction.image && auction.image.includes('via.placeholder.com')) {
                    const title = (auction.title || 'Image').substring(0, 20);
                    const svgText = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f0f0f0"/><text x="400" y="300" font-family="Arial,sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle">${title}</text></svg>`;
                    auction.image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
                }
                return auction;
            });

            setState('auctions', auctions);
            // 关键：云端下发只落本地，避免回写循环
            auctionStorage.saveAuctions(auctions, true, { source: 'cloud' }).catch(() => {});
            logger.info('从云端同步拍卖品数据', { count: auctions.length });
        }, (error) => {
            logger.warn('监听拍卖品数据时出错（使用本地存储）:', error?.message || error);
        });

        // 监听历史记录变化
        onValue(ref(database, 'auctionHistory'), (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const history = Array.isArray(data) ? data : Object.values(data);
            setState('auctionHistory', history);
            historyStorage.saveHistory(history, true, { source: 'cloud' });
            logger.info('从云端同步历史记录', { count: history.length });
        }, (error) => {
            logger.warn('监听历史记录时出错（使用本地存储）:', error?.message || error);
        });

        // 监听用户数据变化（仅落本地 users 列表）
        onValue(ref(database, 'users'), (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const users = Array.isArray(data) ? data : Object.values(data);
            storage.set(STORAGE_KEYS.USERS, users, true);
            logger.info('从云端同步用户数据', { count: users.length });
        }, (error) => {
            logger.warn('监听用户数据时出错（使用本地存储）:', error?.message || error);
        });
    } catch (error) {
        logger.warn('设置实时监听器时出错（使用本地存储）:', error.message);
    }
}

/**
 * 保存拍卖品到云端
 */
export async function saveAuctionsToCloud(auctions) {
    if (!isInitialized) {
        return false;
    }

    try {
        // 清理所有 undefined 值（Firebase 不允许存储 undefined）
        const cleanedAuctions = cleanUndefinedValues(auctions);
        await dbSet(ref(database, 'auctions'), cleanedAuctions);
        logger.info('拍卖品已保存到云端', { count: auctions.length });
        return true;
    } catch (error) {
        logger.error('保存拍卖品到云端失败:', error);
        return false;
    }
}

/**
 * 保存历史记录到云端
 */
export async function saveHistoryToCloud(history) {
    if (!isInitialized) {
        return false;
    }

    try {
        // 清理所有 undefined 值（Firebase 不允许存储 undefined）
        const cleanedHistory = cleanUndefinedValues(history);
        await dbSet(ref(database, 'auctionHistory'), cleanedHistory);
        logger.info('历史记录已保存到云端', { count: history.length });
        return true;
    } catch (error) {
        logger.error('保存历史记录到云端失败:', error);
        return false;
    }
}

/**
 * 清理对象中的 undefined 值（Firebase 不允许存储 undefined）
 * @param {*} obj - 要清理的对象
 * @returns {*} 清理后的对象
 */
function cleanUndefinedValues(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefinedValues(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = cleanUndefinedValues(obj[key]);
                // 只添加非 undefined 的值
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    }
    
    // 基本类型直接返回
    return obj;
}

/**
 * 保存用户数据到云端
 */
export async function saveUsersToCloud(users) {
    if (!isInitialized) {
        return false;
    }

    try {
        // 清理所有 undefined 值（Firebase 不允许存储 undefined）
        const cleanedUsers = cleanUndefinedValues(users);
        await dbSet(ref(database, 'users'), cleanedUsers);
        logger.info('用户数据已保存到云端', { count: users.length });
        return true;
    } catch (error) {
        logger.error('保存用户数据到云端失败:', error);
        return false;
    }
}

/**
 * 从云端加载数据
 */
export async function loadFromCloud() {
    if (!isInitialized) {
        return false;
    }

    try {
        const [auctionsSnap, historySnap, usersSnap] = await Promise.all([
            dbGet(ref(database, 'auctions')),
            dbGet(ref(database, 'auctionHistory')),
            dbGet(ref(database, 'users'))
        ]);

        const auctionsData = auctionsSnap.val();
        const historyData = historySnap.val();
        const usersData = usersSnap.val();
        
        let auctions = auctionsData ? (Array.isArray(auctionsData) ? auctionsData : Object.values(auctionsData)) : [];
        const history = historyData ? (Array.isArray(historyData) ? historyData : Object.values(historyData)) : [];
        const users = usersData ? (Array.isArray(usersData) ? usersData : Object.values(usersData)) : [];

        // 确保所有拍卖品都有必要字段，并清理占位符链接
        auctions = auctions.map(auction => {
            if (!auction.registeredUsers) auction.registeredUsers = [];
            if (!auction.bidHistory) auction.bidHistory = [];
            if (!auction.likes) auction.likes = [];
            if (auction.likesCount === undefined) {
                auction.likesCount = auction.likes.length;
            }
            // 清理 via.placeholder.com 链接，替换为 SVG 占位符
            if (auction.image && auction.image.includes('via.placeholder.com')) {
                const title = (auction.title || 'Image').substring(0, 20);
                const svgText = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f0f0f0"/><text x="400" y="300" font-family="Arial,sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle">${title}</text></svg>`;
                auction.image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
            }
            return auction;
        });

        // 更新本地状态和存储
        if (auctions.length > 0) {
            setState('auctions', auctions);
            await auctionStorage.saveAuctions(auctions, true, { source: 'cloud' }).catch(() => {});
        }

        if (history.length > 0) {
            setState('auctionHistory', history);
            historyStorage.saveHistory(history, true, { source: 'cloud' });
        }

        if (users.length > 0) {
            storage.set(STORAGE_KEYS.USERS, users, true);
        }

        logger.info('从云端加载数据完成', {
            auctions: auctions.length,
            history: history.length,
            users: users.length
        });

        return true;
    } catch (error) {
        logger.error('从云端加载数据失败:', error);
        return false;
    }
}

/**
 * 检查云存储是否可用
 */
export function isCloudStorageAvailable() {
    return isInitialized;
}

export default {
    initCloudStorage,
    saveAuctionsToCloud,
    saveHistoryToCloud,
    saveUsersToCloud,
    loadFromCloud,
    isCloudStorageAvailable
};

