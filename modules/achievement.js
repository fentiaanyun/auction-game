/**
 * 成就系统模块
 * 处理成就检查、解锁和显示
 */

import { getState, setState } from './state.js';
import { userStorage } from './storage.js';
import { USER_CONFIG, ACHIEVEMENTS } from './constants.js';
import { showAchievement } from './notification.js';
import logger from './logger.js';

/**
 * 检查成就
 * @param {number} bidAmount - 出价金额
 */
export function checkAchievements(bidAmount) {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    // 检查初次竞拍成就
    if (currentUser.totalBids === 1) {
        unlockAchievement('first_bid');
    }

    // 检查豪爽藏家成就
    if (bidAmount >= USER_CONFIG.BIG_SPENDER_THRESHOLD) {
        unlockAchievement('big_spender');
    }
}

/**
 * 检查首场胜利成就
 */
export function checkFirstWinAchievement() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    if (currentUser.wonAuctions && currentUser.wonAuctions.length === 1) {
        unlockAchievement('first_win');
    }
}

/**
 * 检查资深藏家成就
 */
export function checkCollectorAchievement() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    if (currentUser.wonAuctions && currentUser.wonAuctions.length >= USER_CONFIG.COLLECTOR_THRESHOLD) {
        unlockAchievement('collector');
        // 更新用户等级
        if (currentUser.level !== '资深藏家') {
            currentUser.level = '资深藏家';
            userStorage.saveUser(currentUser, true);
            setState('currentUser', currentUser);
        }
    }
}

/**
 * 检查闪电竞拍成就
 * @param {Object} auction - 拍卖品对象
 */
export function checkSpeedBidderAchievement(auction) {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    // 在最后10秒内赢得拍卖
    if (auction.extendedTime > 0 || auction.timeLeft <= 10) {
        unlockAchievement('speed_bidder');
    }
}

/**
 * 解锁成就
 * @param {string} achievementId - 成就ID
 */
export function unlockAchievement(achievementId) {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    if (!currentUser.achievements) {
        currentUser.achievements = [];
    }

    // 检查是否已解锁
    if (currentUser.achievements.includes(achievementId)) {
        return;
    }

    // 查找成就定义
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
        logger.warn('成就不存在', { achievementId });
        return;
    }

    // 解锁成就
    currentUser.achievements.push(achievementId);
    userStorage.saveUser(currentUser, true);
    setState('currentUser', currentUser);

    // 显示成就通知
    showAchievement(`🏆 成就解锁：${achievement.name} - ${achievement.description}`);

    logger.info('成就解锁', {
        username: currentUser.username,
        achievementId,
        achievementName: achievement.name
    });
}

/**
 * 获取用户已解锁的成就
 * @returns {Array} 成就列表
 */
export function getUserAchievements() {
    const currentUser = getState('currentUser');
    if (!currentUser || !currentUser.achievements) {
        return [];
    }

    return ACHIEVEMENTS
        .filter(a => currentUser.achievements.includes(a.id))
        .map(a => ({
            ...a,
            unlocked: true
        }));
}

/**
 * 获取所有成就（包括未解锁的）
 * @returns {Array} 成就列表
 */
export function getAllAchievements() {
    const currentUser = getState('currentUser');
    const unlockedIds = currentUser?.achievements || [];

    return ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: unlockedIds.includes(a.id)
    }));
}

/**
 * 检查所有成就（综合检查）
 * @param {Object} context - 上下文信息 { bidAmount?, auction?, isWin? }
 */
export function checkAllAchievements(context = {}) {
    if (context.bidAmount !== undefined) {
        checkAchievements(context.bidAmount);
    }

    if (context.isWin) {
        checkFirstWinAchievement();
        checkCollectorAchievement();
        
        if (context.auction) {
            checkSpeedBidderAchievement(context.auction);
        }
    }
}

