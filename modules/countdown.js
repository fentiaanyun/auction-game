/**
 * 倒计时管理模块
 * 统一管理所有拍卖的倒计时和延时机制
 */

import { getState, setState } from './state.js';
import { auctionStorage } from './storage.js';
import { AUCTION_CONFIG, AUCTION_STATUS } from './constants.js';
import { updateTimerDisplay } from './ui.js';
import { endAuction } from './auction.js';
import { showAchievement } from './notification.js';
import { batchDOMUpdate } from './performance.js';
import timerManager from './timer.js';
import logger from './logger.js';

/**
 * 倒计时管理器
 */
class CountdownManager {
    constructor() {
        this.isRunning = false;
        this.timerId = null;
    }

    /**
     * 启动倒计时系统
     */
    start() {
        if (this.isRunning) {
            logger.warn('倒计时系统已在运行');
            return;
        }

        this.isRunning = true;
        logger.info('⏰ 计时器系统已启动');

        // 每秒更新一次
        this.timerId = timerManager.setInterval('main-countdown', () => {
            this.updateAll();
        }, 1000);
    }

    /**
     * 停止倒计时系统
     */
    stop() {
        if (this.timerId) {
            timerManager.clearInterval('main-countdown');
            this.timerId = null;
        }
        this.isRunning = false;
        logger.info('⏰ 计时器系统已停止');
    }

    /**
     * 更新所有拍卖的倒计时
     */
    updateAll() {
        const auctions = getState('auctions');
        const now = new Date();
        let hasChanges = false;

        auctions.forEach(auction => {
            // 处理pending状态：检查是否到达开始时间（仅普通拍卖）
            if (auction.status === AUCTION_STATUS.PENDING && !auction.isLive && auction.scheduledStartTime) {
                const startTime = new Date(auction.scheduledStartTime);
                if (now >= startTime) {
                    this.startAuction(auction, now);
                    hasChanges = true;
                }
                return;
            }

            // 处理active状态的倒计时
            if (auction.status === AUCTION_STATUS.ACTIVE) {
                const changed = this.updateAuctionCountdown(auction, now);
                if (changed) {
                    hasChanges = true;
                }
            }
        });

        // 保存变化
        if (hasChanges) {
            auctionStorage.saveAuctions(auctions, false);
        }
    }

    /**
     * 开始拍卖
     * @param {Object} auction - 拍卖品对象
     * @param {Date} now - 当前时间
     */
    startAuction(auction, now) {
        if (auction.scheduledEndTime) {
            const endTime = new Date(auction.scheduledEndTime);
            const calculatedTimeLeft = Math.floor((endTime - now) / 1000);

            if (calculatedTimeLeft <= 0) {
                // 结束时间已过，直接流拍
                endAuction(auction);
                showAchievement(`拍卖《${auction.title}》已结束，未在时间内开始，流拍`);
            } else {
                auction.status = AUCTION_STATUS.ACTIVE;
                auction.timeLeft = calculatedTimeLeft;
                showAchievement(`拍卖《${auction.title}》已自动开始！剩余${Math.floor(calculatedTimeLeft/60)}分钟`);
            }
        } else {
            // 没有设置结束时间，使用默认3分钟
            auction.status = AUCTION_STATUS.ACTIVE;
            auction.timeLeft = AUCTION_CONFIG.DEFAULT_DURATION;
            showAchievement(`拍卖《${auction.title}》已自动开始！`);
        }
    }

    /**
     * 更新单个拍卖的倒计时
     * @param {Object} auction - 拍卖品对象
     * @param {Date} now - 当前时间
     * @returns {boolean} 是否有变化
     */
    updateAuctionCountdown(auction, now) {
        let changed = false;

        // 处理实时拍卖的倒计时
        if (auction.isLive && auction.livePhase === 'bidding') {
            if (auction.livePhaseTime > 0) {
                auction.livePhaseTime--;
                auction.timeLeft--;
                changed = true;

                // 更新UI（批量更新优化）
                batchDOMUpdate(() => {
                    updateTimerDisplay(auction.id, auction.timeLeft);
                });

                // 竞拍时间结束
                if (auction.livePhaseTime === 0) {
                    const result = endAuction(auction);
                    if (result.sold && auction.highestBidder) {
                        // 播放烟花（如果需要）
                        if (window.playFireworks) {
                            window.playFireworks(auction.highestBidder);
                        }
                    }
                }
            }
            return changed;
        }

        // 处理普通拍卖的延时
        if (!auction.isLive) {
            if (auction.extendedTime > 0) {
                auction.extendedTime--;
                changed = true;

                // 延时结束，检查是否有新出价
                if (auction.extendedTime === 0) {
                    const timeSinceLastBid = auction.lastBidTime ? 
                        (now.getTime() - auction.lastBidTime) / 1000 : 9999;
                    
                    if (timeSinceLastBid >= AUCTION_CONFIG.EXTEND_TIME) {
                        const result = endAuction(auction);
                        if (result.sold) {
                            showAchievement(result.message);
                        } else {
                            showAchievement(`拍卖《${auction.title}》已结束`);
                        }
                    }
                }
            } else if (auction.timeLeft > 0) {
                auction.timeLeft--;
                changed = true;

                // 更新UI（批量更新优化）
                batchDOMUpdate(() => {
                    updateTimerDisplay(auction.id, auction.timeLeft);
                });

                // 时间到
                if (auction.timeLeft === 0) {
                    // 如果设置了结束时间且无人出价，直接流拍
                    if (auction.scheduledEndTime && !auction.lastBidTime) {
                        const result = endAuction(auction);
                        showAchievement(`拍卖《${auction.title}》已结束，无人出价，流拍`);
                    } else if (auction.lastBidTime) {
                        // 有出价，检查是否需要延时
                        const timeSinceLastBid = (now.getTime() - auction.lastBidTime) / 1000;
                        if (timeSinceLastBid < AUCTION_CONFIG.EXTEND_TIME) {
                            auction.extendedTime = AUCTION_CONFIG.EXTEND_TIME;
                        } else {
                            const result = endAuction(auction);
                            if (result.sold) {
                                showAchievement(result.message);
                            }
                        }
                    } else {
                        // 无设置结束时间，也无出价，结束
                        const result = endAuction(auction);
                        showAchievement(`拍卖《${auction.title}》已结束`);
                    }
                }
            }
        }

        return changed;
    }
}

// 创建单例实例
const countdownManager = new CountdownManager();

/**
 * 启动倒计时系统
 */
export function startCountdown() {
    countdownManager.start();
}

/**
 * 停止倒计时系统
 */
export function stopCountdown() {
    countdownManager.stop();
}

/**
 * 更新所有倒计时
 */
export function updateAllCountdowns() {
    countdownManager.updateAll();
}

export default countdownManager;

