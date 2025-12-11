/**
 * 拍卖核心逻辑模块
 * 处理拍卖相关的所有业务逻辑
 */

import { getState, setState } from './state.js';
import { auctionStorage, historyStorage, userStorage } from './storage.js';
import { AUCTION_CONFIG, AUCTION_STATUS, DEFAULT_AUCTIONS } from './constants.js';
import { generateId } from './utils.js';
import logger from './logger.js';
import timerManager from './timer.js';

/**
 * 初始化拍卖品数据
 */
export function initAuctions() {
    const savedAuctions = auctionStorage.getAuctions();
    
    if (savedAuctions && savedAuctions.length > 0) {
        // 确保所有拍卖品都有必要字段
        savedAuctions.forEach(auction => {
            if (!auction.likes) auction.likes = [];
            if (auction.likesCount === undefined) {
                auction.likesCount = auction.likes.length;
            }
            if (!auction.registeredUsers) auction.registeredUsers = [];
            if (!auction.bidHistory) auction.bidHistory = [];
        });
        setState('auctions', savedAuctions);
    } else {
        // 使用默认拍卖品
        setState('auctions', DEFAULT_AUCTIONS);
        auctionStorage.saveAuctions(DEFAULT_AUCTIONS, true);
    }

    // 加载历史记录
    const savedHistory = historyStorage.getHistory();
    if (savedHistory) {
        setState('auctionHistory', savedHistory);
    }
    
    logger.info('拍卖品数据初始化完成', {
        auctions: getState('auctions').length,
        history: getState('auctionHistory').length
    });
}

/**
 * 获取拍卖品
 * @param {number} auctionId - 拍卖品ID
 * @returns {Object|null} 拍卖品对象或null
 */
export function getAuction(auctionId) {
    const auctions = getState('auctions');
    return auctions.find(a => a.id === auctionId) || null;
}

/**
 * 验证出价
 * @param {Object} auction - 拍卖品对象
 * @param {number} bidAmount - 出价金额
 * @param {Object} user - 用户对象
 * @returns {Object} 验证结果 { valid: boolean, message: string }
 */
export function validateBid(auction, bidAmount, user) {
    if (!auction) {
        return { valid: false, message: '拍卖品不存在' };
    }

    if (auction.status !== AUCTION_STATUS.ACTIVE) {
        return { valid: false, message: '拍卖已结束或未开始' };
    }

    if (!auction.registeredUsers.includes(user.username)) {
        return { valid: false, message: '请先报名参与此拍卖' };
    }

    if (isNaN(bidAmount) || bidAmount <= auction.currentBid) {
        return { valid: false, message: '出价必须高于当前出价' };
    }

    if (bidAmount < auction.currentBid + AUCTION_CONFIG.MIN_INCREMENT) {
        return { 
            valid: false, 
            message: `最低加价为 ¥${AUCTION_CONFIG.MIN_INCREMENT}` 
        };
    }

    if (bidAmount > user.balance) {
        return { valid: false, message: '余额不足' };
    }

    if (auction.highestBidder === user.username) {
        return { valid: false, message: '您已是最高出价者' };
    }

    return { valid: true, message: '' };
}

/**
 * 提交出价
 * @param {number} auctionId - 拍卖品ID
 * @param {number} bidAmount - 出价金额
 * @returns {Object} 结果 { success: boolean, message: string }
 */
export function placeBid(auctionId, bidAmount) {
    const currentUser = getState('currentUser');
    if (!currentUser) {
        return { success: false, message: '请先登录' };
    }

    const auction = getAuction(auctionId);
    if (!auction) {
        return { success: false, message: '拍卖品不存在' };
    }

    // 验证出价
    const validation = validateBid(auction, bidAmount, currentUser);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    // 记录出价
    auction.currentBid = bidAmount;
    auction.highestBidder = currentUser.username;
    auction.lastBidTime = Date.now();
    auction.bidHistory.push({
        user: currentUser.username,
        amount: bidAmount,
        time: new Date()
    });

    // 触发15秒延时机制（仅普通拍卖，实时竞拍不延时）
    if (!auction.isLive && auction.timeLeft < AUCTION_CONFIG.EXTEND_TIME) {
        auction.extendedTime = AUCTION_CONFIG.EXTEND_TIME;
    }

    // 更新用户数据
    currentUser.totalBids++;
    if (!currentUser.bidHistory) {
        currentUser.bidHistory = [];
    }
    currentUser.bidHistory.push({
        auctionId: auction.id,
        title: auction.title,
        amount: bidAmount,
        time: new Date(),
        status: 'active'
    });

    // 保存数据
    userStorage.saveUser(currentUser, true);
    auctionStorage.saveAuctions(getState('auctions'), false);

    logger.info('出价成功', {
        auctionId,
        username: currentUser.username,
        amount: bidAmount
    });

    return { 
        success: true, 
        message: `出价成功！您已出价 ¥${bidAmount.toLocaleString()}` 
    };
}

/**
 * 切换点赞状态
 * @param {number} auctionId - 拍卖品ID
 * @returns {Object} 结果 { success: boolean, liked: boolean, message: string }
 */
export function toggleLike(auctionId) {
    const currentUser = getState('currentUser');
    if (!currentUser) {
        return { success: false, message: '请先登录后再点赞' };
    }

    const auction = getAuction(auctionId);
    if (!auction || auction.isLive) {
        return { success: false, message: '实时竞拍不支持点赞' };
    }

    // 初始化likes数组
    if (!auction.likes) {
        auction.likes = [];
    }

    const username = currentUser.username;
    const likeIndex = auction.likes.indexOf(username);

    if (likeIndex >= 0) {
        // 取消点赞
        auction.likes.splice(likeIndex, 1);
        auction.likesCount = auction.likes.length;
        auctionStorage.saveAuctions(getState('auctions'), false);
        
        logger.debug('取消点赞', { auctionId, username });
        return { 
            success: true, 
            liked: false, 
            message: `已取消对《${auction.title}》的点赞` 
        };
    } else {
        // 添加点赞
        auction.likes.push(username);
        auction.likesCount = auction.likes.length;
        auctionStorage.saveAuctions(getState('auctions'), false);
        
        logger.debug('添加点赞', { auctionId, username });
        return { 
            success: true, 
            liked: true, 
            message: `已点赞《${auction.title}》` 
        };
    }
}

/**
 * 检查是否已点赞
 * @param {number} auctionId - 拍卖品ID
 * @returns {boolean} 是否已点赞
 */
export function isLiked(auctionId) {
    const currentUser = getState('currentUser');
    if (!currentUser) return false;

    const auction = getAuction(auctionId);
    if (!auction || !auction.likes) return false;

    return auction.likes.includes(currentUser.username);
}

/**
 * 报名参与拍卖
 * @param {number} auctionId - 拍卖品ID
 * @param {Object} options - 报名选项 { realName?, phone?, note? }
 * @returns {Object} 结果 { success: boolean, message: string }
 */
export function registerForAuction(auctionId, options = {}) {
    const currentUser = getState('currentUser');
    if (!currentUser) {
        return { success: false, message: '请先登录' };
    }

    const auction = getAuction(auctionId);
    if (!auction) {
        return { success: false, message: '拍卖品不存在' };
    }

    // 检查是否已报名
    if (auction.registeredUsers.includes(currentUser.username)) {
        return { success: false, message: '您已经报名过了' };
    }

    // 添加到已报名列表
    auction.registeredUsers.push(currentUser.username);

    // 添加到用户的报名记录
    if (!currentUser.registrations) {
        currentUser.registrations = [];
    }
    currentUser.registrations.push({
        auctionId: auction.id,
        title: auction.title,
        time: new Date(),
        realName: options.realName,
        phone: options.phone,
        note: options.note
    });

    // 保存数据
    auctionStorage.saveAuctions(getState('auctions'), false);
    userStorage.saveUser(currentUser, true);

    logger.info('报名成功', {
        auctionId,
        username: currentUser.username
    });

    return { 
        success: true, 
        message: `成功报名拍卖：${auction.title}` 
    };
}

/**
 * 检查是否已报名
 * @param {number} auctionId - 拍卖品ID
 * @returns {boolean} 是否已报名
 */
export function isRegistered(auctionId) {
    const currentUser = getState('currentUser');
    if (!currentUser) return false;

    const auction = getAuction(auctionId);
    if (!auction || !auction.registeredUsers) return false;

    return auction.registeredUsers.includes(currentUser.username);
}

/**
 * 结束拍卖
 * @param {Object} auction - 拍卖品对象
 */
export function endAuction(auction) {
    auction.status = AUCTION_STATUS.ENDED;
    auction.endTime = new Date();

    // 添加到历史记录
    const history = getState('auctionHistory');
    if (!history.find(h => h.id === auction.id)) {
        history.push({ ...auction });
        setState('auctionHistory', history);
        historyStorage.saveHistory(history, false);
    }

    // 检查是否达到保留价
    if (auction.currentBid < auction.reservePrice) {
        logger.info('拍卖流拍', {
            auctionId: auction.id,
            currentBid: auction.currentBid,
            reservePrice: auction.reservePrice
        });
        return { sold: false, message: `拍卖《${auction.title}》未达保留价，流拍` };
    }

    // 处理赢家
    if (auction.highestBidder) {
        const winner = userStorage.getUser(auction.highestBidder);
        if (winner) {
            // 扣款
            winner.balance -= auction.currentBid;

            // 记录赢得的拍卖
            if (!winner.wonAuctions) {
                winner.wonAuctions = [];
            }
            winner.wonAuctions.push({
                auctionId: auction.id,
                title: auction.title,
                image: auction.image,
                amount: auction.currentBid,
                time: new Date(),
                isLive: auction.isLive || false
            });

            // 更新竞拍历史状态
            const bidHistoryItem = winner.bidHistory?.find(
                b => b.auctionId === auction.id && b.status === 'active'
            );
            if (bidHistoryItem) {
                bidHistoryItem.status = 'won';
            }

            userStorage.saveUser(winner, true);

            // 如果是当前用户，更新状态
            const currentUser = getState('currentUser');
            if (currentUser && currentUser.username === winner.username) {
                setState('currentUser', winner);
            }

            logger.info('拍卖成交', {
                auctionId: auction.id,
                winner: winner.username,
                amount: auction.currentBid
            });

            return { 
                sold: true, 
                winner: winner.username,
                message: `拍卖《${auction.title}》已结束，由 ${winner.username} 赢得` 
            };
        }
    }

    return { sold: false, message: `拍卖《${auction.title}》已结束` };
}

/**
 * AI竞价
 * @param {number} auctionId - 拍卖品ID
 * @returns {Object|null} 竞价结果或null
 */
export function triggerAIBid(auctionId) {
    const auction = getAuction(auctionId);
    
    // 只在普通拍卖中触发AI竞价
    if (!auction || 
        auction.status !== AUCTION_STATUS.ACTIVE || 
        auction.isLive || 
        auction.timeLeft < 10) {
        return null;
    }

    // 概率检查
    if (Math.random() > AUCTION_CONFIG.AI_BID_PROBABILITY) {
        return null;
    }

    const aiNames = [
        'AI_收藏家_01', 'AI_收藏家_02', 'AI_收藏家_03',
        '神秘买家', '资深藏家', '艺术爱好者'
    ];

    const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];

    // AI出价在当前价+100到当前价+500之间
    const aiIncrement = Math.floor(
        Math.random() * (AUCTION_CONFIG.AI_BID_INCREMENT_MAX / AUCTION_CONFIG.MIN_INCREMENT) + 1
    ) * AUCTION_CONFIG.MIN_INCREMENT;
    const aiBidAmount = auction.currentBid + aiIncrement;

    // AI不会超过保留价太多
    if (aiBidAmount > auction.reservePrice * AUCTION_CONFIG.AI_MAX_PRICE_MULTIPLIER) {
        return null;
    }

    // AI自动报名（如果还没报名）
    if (!auction.registeredUsers.includes(aiName)) {
        auction.registeredUsers.push(aiName);
    }

    // 记录AI出价
    auction.currentBid = aiBidAmount;
    auction.highestBidder = aiName;
    auction.lastBidTime = Date.now();
    auction.bidHistory.push({
        user: aiName,
        amount: aiBidAmount,
        time: new Date()
    });

    // 触发15秒延时
    if (auction.timeLeft < AUCTION_CONFIG.EXTEND_TIME) {
        auction.extendedTime = AUCTION_CONFIG.EXTEND_TIME;
    }

    auctionStorage.saveAuctions(getState('auctions'), false);

    logger.debug('AI竞价', {
        auctionId,
        aiName,
        amount: aiBidAmount
    });

    return {
        aiName,
        amount: aiBidAmount,
        message: `${aiName} 出价 ¥${aiBidAmount.toLocaleString()}`
    };
}

/**
 * 获取拍卖品列表（支持筛选）
 * @param {Object} filters - 筛选条件 { category?, priceRange?, status? }
 * @returns {Array} 筛选后的拍卖品列表
 */
export function getAuctions(filters = {}) {
    let auctions = getState('auctions');

    if (filters.category && filters.category !== 'all') {
        auctions = auctions.filter(a => a.category === filters.category);
    }

    if (filters.status && filters.status !== 'all') {
        auctions = auctions.filter(a => a.status === filters.status);
    }

    if (filters.priceRange && filters.priceRange !== 'all') {
        const [min, max] = filters.priceRange.split('-').map(v => v.replace('+', ''));
        auctions = auctions.filter(a => {
            if (max) {
                return a.currentBid >= parseInt(min) && a.currentBid <= parseInt(max);
            } else {
                return a.currentBid >= parseInt(min);
            }
        });
    }

    return auctions;
}

