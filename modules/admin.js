/**
 * 管理员功能模块
 * 处理所有管理员相关的功能
 */

import { getState, setState } from './state.js';
import { auctionStorage } from './storage.js';
import { AUCTION_CONFIG, AUCTION_STATUS, ADMIN_CONFIG } from './constants.js';
import { generateId, formatDateTimeLocal, $ } from './utils.js';
import { getCategoryName } from './utils.js';
import { showSuccess, showError } from './notification.js';
import logger from './logger.js';

/**
 * 图片预览和上传
 * @param {HTMLInputElement} input - 文件输入元素
 * @param {string} previewId - 预览图片元素ID
 * @param {string} urlInputId - URL输入框元素ID
 */
export function previewImage(input, previewId, urlInputId) {
    const file = input.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        showError('请选择图片文件');
        input.value = '';
        return;
    }

    // 检查文件大小
    if (file.size > ADMIN_CONFIG.MAX_IMAGE_SIZE) {
        showError(`图片文件不能超过${ADMIN_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;

        // 显示预览
        const preview = $(`#${previewId}`);
        if (preview) {
            preview.src = base64Data;
            preview.style.display = 'block';
        }

        // 将base64数据填充到URL输入框
        const urlInput = $(`#${urlInputId}`);
        if (urlInput) {
            urlInput.value = base64Data;
        }

        showSuccess('✅ 图片已上传并转换为base64格式');
    };

    reader.onerror = () => {
        showError('读取图片失败，请重试');
        input.value = '';
    };

    reader.readAsDataURL(file);
}

/**
 * 发布普通拍卖品
 * @param {Object} formData - 表单数据
 * @returns {Object} 结果 { success: boolean, message: string, auction?: Object }
 */
export function publishAuction(formData) {
    const {
        title,
        artist,
        category,
        image,
        description,
        startPrice,
        reservePrice,
        startTime,
        endTime
    } = formData;

    // 验证必填字段
    if (!title || !artist || !image || !description || !startPrice || !reservePrice) {
        return { success: false, message: '请填写所有必填字段' };
    }

    if (reservePrice < startPrice) {
        return { success: false, message: '保留价不能低于起拍价' };
    }

    // 处理时间
    const now = new Date();
    const scheduledStartTime = startTime ? new Date(startTime) : null;
    const scheduledEndTime = endTime ? new Date(endTime) : null;

    // 验证时间逻辑
    if (scheduledStartTime && scheduledEndTime && scheduledStartTime >= scheduledEndTime) {
        return { success: false, message: '结束时间必须晚于开始时间' };
    }

    // 计算初始状态和时间
    let initialStatus = AUCTION_STATUS.PENDING;
    let timeLeft = AUCTION_CONFIG.DEFAULT_DURATION;

    if (!scheduledStartTime) {
        // 没有设置开始时间，立即开始
        initialStatus = AUCTION_STATUS.ACTIVE;
        if (scheduledEndTime) {
            timeLeft = Math.floor((scheduledEndTime - now) / 1000);
        }
    } else if (scheduledStartTime <= now) {
        // 开始时间已过，立即开始
        initialStatus = AUCTION_STATUS.ACTIVE;
        if (scheduledEndTime) {
            timeLeft = Math.floor((scheduledEndTime - now) / 1000);
        }
    } else {
        // 等待开始
        initialStatus = AUCTION_STATUS.PENDING;
        timeLeft = 0;
    }

    const newAuction = {
        id: generateId(),
        title,
        artist,
        category,
        image,
        description,
        startPrice,
        currentBid: startPrice,
        reservePrice,
        timeLeft,
        extendedTime: 0,
        lastBidTime: null,
        status: initialStatus,
        bidHistory: [],
        highestBidder: null,
        registeredUsers: [],
        scheduledStartTime: scheduledStartTime ? scheduledStartTime.toISOString() : null,
        scheduledEndTime: scheduledEndTime ? scheduledEndTime.toISOString() : null,
        isScheduled: !!scheduledStartTime || !!scheduledEndTime,
        likes: [],
        likesCount: 0
    };

    // 添加到拍卖列表
    const auctions = getState('auctions');
    auctions.unshift(newAuction);
    setState('auctions', auctions);
    auctionStorage.saveAuctions(auctions, true);

    logger.info('发布拍卖品', {
        auctionId: newAuction.id,
        title,
        status: initialStatus
    });

    const statusMsg = initialStatus === AUCTION_STATUS.PENDING ? '（等待开始）' : 
                     initialStatus === AUCTION_STATUS.ACTIVE ? '（进行中）' : '';
    
    return {
        success: true,
        message: `成功发布拍卖品：${title} ${statusMsg}`,
        auction: newAuction
    };
}

/**
 * 发布实时竞拍
 * @param {Object} formData - 表单数据
 * @returns {Object} 结果 { success: boolean, message: string, auction?: Object }
 */
export function publishLiveAuction(formData) {
    const {
        title,
        artist,
        category,
        image,
        description,
        startPrice,
        reservePrice,
        duration
    } = formData;

    // 验证必填字段
    if (!title || !artist || !image || !description || !startPrice || !reservePrice) {
        return { success: false, message: '请填写所有必填字段' };
    }

    if (reservePrice < startPrice) {
        return { success: false, message: '保留价不能低于起拍价' };
    }

    const auctionDuration = duration || 3; // 默认3分钟
    if (auctionDuration < ADMIN_CONFIG.MIN_AUCTION_DURATION || 
        auctionDuration > ADMIN_CONFIG.MAX_AUCTION_DURATION) {
        return { 
            success: false, 
            message: `竞拍时长必须在${ADMIN_CONFIG.MIN_AUCTION_DURATION}-${ADMIN_CONFIG.MAX_AUCTION_DURATION}分钟之间` 
        };
    }

    const newLiveAuction = {
        id: generateId(),
        title,
        artist,
        category,
        image,
        description,
        startPrice,
        currentBid: startPrice,
        reservePrice,
        timeLeft: 0,
        extendedTime: 0,
        lastBidTime: null,
        status: AUCTION_STATUS.PENDING, // 等待管理员手动开始
        bidHistory: [],
        highestBidder: null,
        registeredUsers: [],
        isLive: true,
        livePhase: 'waiting', // waiting | bidding | ended
        liveDuration: auctionDuration * 60, // 保存秒数
        livePhaseTime: 0, // 当前阶段剩余时间
        likes: [],
        likesCount: 0
    };

    // 添加到拍卖列表
    const auctions = getState('auctions');
    auctions.unshift(newLiveAuction);
    setState('auctions', auctions);
    auctionStorage.saveAuctions(auctions, true);

    logger.info('发布实时竞拍', {
        auctionId: newLiveAuction.id,
        title,
        duration: auctionDuration
    });

    return {
        success: true,
        message: `成功发布实时竞拍：${title}（${auctionDuration}分钟）。用户现在可以报名，点击"开始"按钮开始竞拍。`,
        auction: newLiveAuction
    };
}

/**
 * 开始实时竞拍
 * @param {number} auctionId - 拍卖品ID
 * @returns {Object} 结果 { success: boolean, message: string }
 */
export function startLiveAuction(auctionId) {
    const auctions = getState('auctions');
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction || !auction.isLive) {
        return { success: false, message: '拍卖品不存在或不是实时竞拍' };
    }

    // 直接进入竞拍阶段，使用设置的时长
    const duration = auction.liveDuration || AUCTION_CONFIG.DEFAULT_DURATION;
    auction.status = AUCTION_STATUS.ACTIVE;
    auction.livePhase = 'bidding';
    auction.livePhaseTime = duration;
    auction.timeLeft = duration;

    setState('auctions', auctions);
    auctionStorage.saveAuctions(auctions, true);

    logger.info('启动实时竞拍', {
        auctionId,
        title: auction.title,
        duration
    });

    const durationMin = Math.floor(duration / 60);
    return {
        success: true,
        message: `实时竞拍《${auction.title}》已开始！竞拍时长：${durationMin}分钟`
    };
}

/**
 * 更新拍卖品
 * @param {number} auctionId - 拍卖品ID
 * @param {Object} formData - 表单数据
 * @returns {Object} 结果 { success: boolean, message: string }
 */
export function updateAuction(auctionId, formData) {
    const auctions = getState('auctions');
    const auction = auctions.find(a => a.id === auctionId);

    if (!auction) {
        return { success: false, message: '拍卖品不存在' };
    }

    const {
        title,
        artist,
        category,
        image,
        description,
        startPrice,
        reservePrice,
        startTime,
        endTime
    } = formData;

    // 验证必填字段
    if (!title || !artist || !image || !description || !startPrice || !reservePrice) {
        return { success: false, message: '请填写所有必填字段' };
    }

    if (reservePrice < startPrice) {
        return { success: false, message: '保留价不能低于起拍价' };
    }

    // 处理时间
    const scheduledStartTime = startTime ? new Date(startTime) : null;
    const scheduledEndTime = endTime ? new Date(endTime) : null;

    if (scheduledStartTime && scheduledEndTime && scheduledStartTime >= scheduledEndTime) {
        return { success: false, message: '结束时间必须晚于开始时间' };
    }

    // 更新拍卖品信息
    auction.title = title;
    auction.artist = artist;
    auction.category = category;
    auction.image = image;
    auction.description = description;
    auction.startPrice = startPrice;
    auction.reservePrice = reservePrice;
    auction.scheduledStartTime = scheduledStartTime ? scheduledStartTime.toISOString() : null;
    auction.scheduledEndTime = scheduledEndTime ? scheduledEndTime.toISOString() : null;
    auction.isScheduled = !!scheduledStartTime || !!scheduledEndTime;

    // 如果还未开始竞拍，更新当前价格
    if (auction.bidHistory.length === 0) {
        auction.currentBid = startPrice;
    }

    // 重新计算状态
    const now = new Date();
    if (scheduledStartTime && scheduledStartTime > now && auction.status === AUCTION_STATUS.ACTIVE) {
        auction.status = AUCTION_STATUS.PENDING;
        auction.timeLeft = 0;
    } else if ((!scheduledStartTime || scheduledStartTime <= now) && auction.status === AUCTION_STATUS.PENDING) {
        auction.status = AUCTION_STATUS.ACTIVE;
        if (scheduledEndTime) {
            auction.timeLeft = Math.floor((scheduledEndTime - now) / 1000);
        } else {
            auction.timeLeft = AUCTION_CONFIG.DEFAULT_DURATION;
        }
    }

    setState('auctions', auctions);
    auctionStorage.saveAuctions(auctions, true);

    logger.info('更新拍卖品', {
        auctionId,
        title
    });

    return {
        success: true,
        message: `成功更新拍卖品：${title}`
    };
}

/**
 * 删除拍卖品
 * @param {number} auctionId - 拍卖品ID
 * @returns {Object} 结果 { success: boolean, message: string }
 */
export function deleteAuction(auctionId) {
    const auctions = getState('auctions');
    const index = auctions.findIndex(a => a.id === auctionId);
    
    if (index < 0) {
        return { success: false, message: '拍卖品不存在' };
    }

    const auction = auctions[index];

    // 如果拍卖已结束，移到历史记录
    if (auction.status === AUCTION_STATUS.ENDED) {
        const history = getState('auctionHistory');
        if (!history.find(h => h.id === auction.id)) {
            history.push({ ...auction, deletedAt: new Date() });
            setState('auctionHistory', history);
        }
    }

    auctions.splice(index, 1);
    setState('auctions', auctions);
    auctionStorage.saveAuctions(auctions, true);

    logger.info('删除拍卖品', {
        auctionId,
        title: auction.title
    });

    return {
        success: true,
        message: '拍卖品已删除'
    };
}

/**
 * 渲染管理员页面
 */
export function renderAdminPage() {
    const container = $('#adminAuctionList');
    if (!container) return;

    container.innerHTML = '';
    const auctions = getState('auctions');

    if (auctions.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">暂无拍卖品</p>';
        return;
    }

    auctions.forEach(auction => {
        const item = document.createElement('div');
        item.className = 'admin-auction-item';

        // 状态文本
        let statusText = '';
        if (auction.status === AUCTION_STATUS.PENDING) {
            statusText = '等待开始';
        } else if (auction.status === AUCTION_STATUS.ACTIVE) {
            statusText = '进行中';
        } else {
            statusText = '已结束';
        }

        // 实时拍卖阶段
        let phaseText = '';
        if (auction.isLive && auction.livePhase) {
            if (auction.livePhase === 'waiting') phaseText = '等待开始';
            else if (auction.livePhase === 'bidding') phaseText = '竞拍中';
        }

        // 时间信息
        let timeInfo = '';
        if (auction.scheduledStartTime) {
            const startDate = new Date(auction.scheduledStartTime);
            timeInfo += `开始: ${startDate.toLocaleString()} `;
        }
        if (auction.scheduledEndTime) {
            const endDate = new Date(auction.scheduledEndTime);
            timeInfo += `结束: ${endDate.toLocaleString()}`;
        }

        item.innerHTML = `
            <img src="${auction.image}" alt="${auction.title}">
            <div class="admin-auction-info">
                <h4>${auction.title}${auction.isLive ? ' <span style="color:var(--warning);"><i class="fas fa-bolt"></i> 实时</span>' : ''}</h4>
                <p>${auction.artist} | ${getCategoryName(auction.category)}</p>
                <p>当前价: ${auction.currentBid.toLocaleString()} | 状态: ${statusText}</p>
                <p>已报名: ${auction.registeredUsers.length} 人</p>
                ${phaseText ? `<p style="color:var(--warning);">阶段: ${phaseText}</p>` : ''}
                ${timeInfo ? `<p style="color:var(--text-muted);font-size:0.85rem;">${timeInfo}</p>` : ''}
            </div>
            <div class="admin-auction-actions">
                ${auction.isLive && auction.livePhase === 'waiting' ? `
                    <button class="btn-primary" onclick="window.startLiveAuction(${auction.id})" style="background:var(--gradient-success);">
                        <i class="fas fa-play"></i> 开始
                    </button>
                ` : ''}
                ${auction.status === AUCTION_STATUS.ACTIVE || auction.status === AUCTION_STATUS.PENDING ? `
                    <button class="btn-secondary" onclick="window.openEditModal(${auction.id})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="window.deleteAuction(${auction.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * 切换管理员标签页
 * @param {string} tabName - 标签页名称
 */
export function switchAdminTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 移除所有标签的active状态
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 显示选中的标签内容
    if (tabName === 'auction') {
        const tab = $('#adminAuctionTab');
        if (tab) tab.classList.add('active');
        event?.target?.classList.add('active');
    } else if (tabName === 'settings') {
        const tab = $('#adminSettingsTab');
        if (tab) tab.classList.add('active');
        event?.target?.classList.add('active');
        // 初始化设置页面（如果需要）
        if (window.initSettingsPage) {
            window.initSettingsPage();
        }
    }
}

// 保持向后兼容（全局函数）
if (typeof window !== 'undefined') {
    window.previewImage = previewImage;
    window.publishAuction = publishAuction;
    window.publishLiveAuction = publishLiveAuction;
    window.startLiveAuction = startLiveAuction;
    window.updateAuction = updateAuction;
    window.deleteAuction = deleteAuction;
    window.renderAdminPage = renderAdminPage;
    window.switchAdminTab = switchAdminTab;
}

