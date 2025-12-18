/**
 * 臻藏拍卖 - 主应用文件（模块化版本）
 * 使用ES6模块重构
 */

// ==================== 导入所有模块 ====================

// 基础模块
import { 
    AUCTION_CONFIG, 
    USER_CONFIG, 
    STORAGE_KEYS,
    DEFAULT_AUCTIONS,
    AUCTION_STATUS,
    THEME_PRESETS
} from './modules/constants.js';

import { 
    formatTime, 
    getCategoryName, 
    formatCurrency,
    formatDateTimeLocal,
    generateId,
    $,
    debounce,
    copyToClipboard
} from './modules/utils.js';

import { 
    auctionStorage, 
    userStorage, 
    historyStorage,
    settingsStorage 
} from './modules/storage.js';

// 云存储模块（可选）
import { 
    initCloudStorage,
    saveAuctionsToCloud,
    saveHistoryToCloud,
    saveUsersToCloud,
    loadFromCloud,
    isCloudStorageAvailable
} from './modules/cloudStorage.js';

import { 
    getState, 
    setState,
    AppState 
} from './modules/state.js';

import timerManager from './modules/timer.js';
import logger from './modules/logger.js';

// 业务模块
import { 
    initAuctions,
    getAuction,
    placeBid as auctionPlaceBid,
    toggleLike as auctionToggleLike,
    registerForAuction,
    isRegistered,
    isLiked,
    endAuction,
    triggerAIBid,
    getAuctions
} from './modules/auction.js';

import { 
    login,
    register,
    logout,
    updateUserUI,
    isAdmin,
    getDisplayName,
    checkDailyLogin,
    openAuthModal,
    closeAuthModal,
    showLogin,
    showRegister
} from './modules/auth.js';

import { 
    showAchievement,
    showSuccess,
    showError,
    showWarning,
    showInfo
} from './modules/notification.js';

import { 
    renderFeaturedAuctions,
    renderCatalog,
    createAuctionCard,
    updateTimerDisplay,
    updateBidDisplay,
    showPage
} from './modules/ui.js';

import { 
    checkAchievements,
    checkAllAchievements,
    unlockAchievement
} from './modules/achievement.js';

import { 
    startCountdown 
} from './modules/countdown.js';

import { 
    publishAuction,
    publishLiveAuction,
    startLiveAuction,
    updateAuction,
    deleteAuction,
    renderAdminPage,
    switchAdminTab,
    previewImage
} from './modules/admin.js';

import { 
    batchDOMUpdate 
} from './modules/performance.js';

// ==================== 全局函数（向后兼容） ====================

// 初始化拍卖品（使用新模块）
const initAuctionsWrapper = () => {
    initAuctions();
};

// 保存拍卖品（使用新模块）
const saveAuctions = () => {
    auctionStorage.saveAuctions(getState('auctions'), false);
};

// 保存历史记录（使用新模块）
const saveHistory = () => {
    historyStorage.saveHistory(getState('auctionHistory'), false);
};

// 保存用户（使用新模块）
const saveUser = (user) => {
    userStorage.saveUser(user, true);
};

// 获取用户（使用新模块）
const getUser = (username) => {
    return userStorage.getUser(username);
};

// ==================== 页面切换（使用新模块） ====================

// 页面切换函数已从ui.js导入，这里添加特定页面的回调
const showPageWrapper = (pageName) => {
    showPage(pageName);
    
    // 特定页面的额外处理
    if (pageName === 'mybids') {
        if (!getState('currentUser')) {
            showError('请先登录');
            openAuthModal();
            return;
        }
        renderMyBids();
    } else if (pageName === 'history') {
        renderHistory();
    } else if (pageName === 'live') {
        renderLivePage();
    } else if (pageName === 'admin') {
        if (!isAdmin()) {
            showError('您没有管理员权限');
            showPage('home');
            return;
        }
        renderAdminPage();
    } else if (pageName === 'settings') {
        initSettingsPage();
    }
};

// ==================== 报名系统（使用新模块） ====================

let currentRegistrationAuction = null;

const openRegistrationModal = (auctionId) => {
    if (!getState('currentUser')) {
        showError('请先登录');
        openAuthModal();
        return;
    }

    const auction = getAuction(auctionId);
    if (!auction) return;

    currentRegistrationAuction = auction;

    const infoContainer = $('#registrationAuctionInfo');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <h3>${auction.title}</h3>
            <p>${auction.artist}</p>
            <p>起拍价: ${formatCurrency(auction.startPrice)}</p>
        `;
    }

    // 重置手动表单
    const manualForm = $('#manualRegistrationForm');
    if (manualForm) manualForm.style.display = 'none';
    const regRealName = $('#regRealName');
    const regPhone = $('#regPhone');
    const regNote = $('#regNote');
    if (regRealName) regRealName.value = '';
    if (regPhone) regPhone.value = '';
    if (regNote) regNote.value = '';

    const modal = $('#registrationModal');
    if (modal) modal.style.display = 'block';
};

const closeRegistrationModal = () => {
    const modal = $('#registrationModal');
    if (modal) modal.style.display = 'none';
    currentRegistrationAuction = null;
};

const quickRegister = () => {
    if (!currentRegistrationAuction) return;

    const result = registerForAuction(currentRegistrationAuction.id);
    if (result.success) {
        showAchievement(result.message);
        closeRegistrationModal();
    } else {
        showError(result.message);
    }
};

const showManualRegistration = () => {
    const manualForm = $('#manualRegistrationForm');
    if (manualForm) manualForm.style.display = 'block';
};

const manualRegister = () => {
    if (!currentRegistrationAuction) return;

    const regRealName = $('#regRealName');
    const regPhone = $('#regPhone');
    const regNote = $('#regNote');

    const result = registerForAuction(currentRegistrationAuction.id, {
        realName: regRealName?.value.trim() || '',
        phone: regPhone?.value.trim() || '',
        note: regNote?.value.trim() || ''
    });

    if (result.success) {
        showAchievement(result.message);
        closeRegistrationModal();
    } else {
        showError(result.message);
    }
};

// ==================== 拍卖详情（使用新模块） ====================

const openAuctionDetail = (auctionId) => {
    const auction = getAuction(auctionId);
    if (!auction) return;

    const modal = $('#auctionModal');
    const detailContainer = $('#auctionDetail');
    if (!modal || !detailContainer) return;

    const timeDisplay = formatTime(auction.timeLeft || 0);
    const registered = isRegistered(auctionId);
    const liked = isLiked(auctionId);
    const likesCount = auction.likesCount || 0;
    const currentUser = getState('currentUser');

    detailContainer.innerHTML = `
        <div class="auction-detail-container">
            <div>
                <img src="${auction.image}" alt="${auction.title}" class="auction-detail-image">
            </div>
            <div class="auction-detail-info">
                <div style="margin-bottom:1rem;">
                    <h2 style="margin-bottom:0.5rem;">${auction.title}</h2>
                    <p class="artist">${auction.artist}</p>
                </div>
                <p class="description">${auction.description}</p>

                <div class="current-bid">
                    <h3>当前出价</h3>
                    <div class="bid-amount" id="detailCurrentBid">${formatCurrency(auction.currentBid)}</div>
                    ${auction.highestBidder ? `<p style="color:var(--text-muted);margin-top:0.5rem;">最高出价者: ${getDisplayName(auction.highestBidder)}</p>` : ''}
                    <p style="color:var(--text-muted);margin-top:0.5rem;">起拍价: ${formatCurrency(auction.startPrice)}</p>
                    <p style="color:var(--text-secondary);margin-top:0.5rem;">已报名: ${auction.registeredUsers.length} 人</p>
                    ${auction.status === AUCTION_STATUS.ACTIVE ? `
                        <p style="color:var(--text-secondary);margin-top:0.5rem;">
                            <i class="fas fa-clock"></i> 剩余时间: <span id="detailTimer">${timeDisplay}</span>
                            ${auction.extendedTime > 0 ? '<span style="color:var(--warning);"> (延时中)</span>' : ''}
                        </p>
                    ` : `
                        <p style="color:var(--danger);margin-top:0.5rem;">拍卖已结束</p>
                    `}
                </div>

                ${!registered && auction.status === AUCTION_STATUS.ACTIVE ? `
                    <div style="padding:1rem;background:rgba(245,87,108,0.1);border:1px solid var(--danger);border-radius:8px;margin-bottom:1rem;">
                        <p style="color:var(--danger);margin-bottom:0.5rem;"><i class="fas fa-exclamation-circle"></i> 您还未报名参与此拍卖</p>
                        <button class="btn-primary" onclick="closeAuctionModal(); openRegistrationModal(${auction.id})">
                            立即报名
                        </button>
                    </div>
                ` : ''}

                ${auction.status === AUCTION_STATUS.ACTIVE && registered ? `
                    <div class="bid-form">
                        <input
                            type="number"
                            id="bidAmount"
                            placeholder="请输入出价金额"
                            min="${auction.currentBid + AUCTION_CONFIG.MIN_INCREMENT}"
                            value="${auction.currentBid + AUCTION_CONFIG.MIN_INCREMENT}"
                        >
                        <button class="btn-large" onclick="placeBid(${auction.id})" style="width:100%;">
                            <i class="fas fa-gavel"></i> 立即出价
                        </button>
                        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem;">
                            最低加价: ${formatCurrency(AUCTION_CONFIG.MIN_INCREMENT)} | 出价后${AUCTION_CONFIG.EXTEND_TIME}秒内无人加价则结束
                        </p>
                    </div>
                ` : ''}

                <div class="bid-history">
                    <h3>出价历史</h3>
                    <div id="bidHistoryDetail">
                        ${auction.bidHistory && auction.bidHistory.length > 0 ?
                            auction.bidHistory.slice(-AUCTION_CONFIG.BID_HISTORY_DISPLAY_COUNT).reverse().map(bid => `
                                <div class="bid-item">
                                    <span class="bid-item-user">${getDisplayName(bid.user)}</span>
                                    <span class="bid-item-amount">${formatCurrency(bid.amount)}</span>
                                </div>
                            `).join('') :
                            '<p style="color:var(--text-muted);">暂无出价记录</p>'
                        }
                    </div>
                </div>

                <!-- 底部操作按钮 -->
                <div style="display:flex;justify-content:flex-end;align-items:center;gap:1.5rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color);">
                    ${!auction.isLive ? `
                        <div onclick="toggleLike(${auction.id})" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;transition:all 0.3s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="${liked ? 'fas' : 'far'} fa-heart" style="color:${liked ? 'var(--danger)' : 'var(--text-muted)'};font-size:1.5rem;"></i>
                            <span style="color:var(--text-secondary);font-size:1rem;">${likesCount}</span>
                        </div>
                    ` : ''}
                    <button class="btn-secondary" onclick="shareAuction(${auction.id})" style="padding:0.75rem 1.5rem;">
                        <i class="fas fa-share-alt"></i> 分享
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
};

const closeAuctionModal = () => {
    const modal = $('#auctionModal');
    if (modal) modal.style.display = 'none';
};

// ==================== 出价功能（使用新模块） ====================

const placeBid = (auctionId) => {
    const bidAmountInput = $('#bidAmount');
    if (!bidAmountInput) return;

    const bidAmount = parseInt(bidAmountInput.value);
    const result = auctionPlaceBid(auctionId, bidAmount);

    if (result.success) {
        // 检查成就
        checkAchievements(bidAmount);

        // 刷新UI
        batchDOMUpdate(() => {
            openAuctionDetail(auctionId);
            renderFeaturedAuctions();
            renderCatalog();
            updateUserUI();
        });

        showAchievement(result.message);

        // 触发AI竞价
        timerManager.setTimeout(`ai-bid-${auctionId}`, () => {
            const aiResult = triggerAIBid(auctionId);
            if (aiResult && getState('currentUser')) {
                showInfo(aiResult.message);
                batchDOMUpdate(() => {
                    openAuctionDetail(auctionId);
                    renderFeaturedAuctions();
                    renderCatalog();
                });
            }
        }, Math.random() * (AUCTION_CONFIG.AI_BID_DELAY_MAX - AUCTION_CONFIG.AI_BID_DELAY_MIN) + AUCTION_CONFIG.AI_BID_DELAY_MIN);
    } else {
        showError(result.message);
        if (result.message.includes('登录')) {
            closeAuctionModal();
            openAuthModal();
        }
    }
};

// ==================== 点赞功能（使用新模块） ====================

const toggleLike = (auctionId) => {
    const result = auctionToggleLike(auctionId);
    
    if (result.success) {
        showAchievement(result.message);
        batchDOMUpdate(() => {
            renderFeaturedAuctions();
            if ($('#catalogPage')?.classList.contains('active')) {
                renderCatalog();
            }
        });
    } else if (result.message) {
        showError(result.message);
        if (result.message.includes('登录')) {
            openAuthModal();
        }
    }
};

// ==================== 筛选功能（使用新模块） ====================

const filterAuctions = () => {
    const categoryFilter = $('#categoryFilter')?.value || 'all';
    const priceFilter = $('#priceFilter')?.value || 'all';
    const statusFilter = $('#statusFilter')?.value || 'all';

    renderCatalog({
        category: categoryFilter,
        priceRange: priceFilter,
        status: statusFilter
    });
};

// ==================== 我的竞拍页面 ====================

const renderMyBids = () => {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    // 更新统计数据
    const totalBids = $('#totalBids');
    const wonAuctions = $('#wonAuctions');
    const userLevel = $('#userLevel');
    
    if (totalBids) totalBids.textContent = currentUser.totalBids || 0;
    if (wonAuctions) wonAuctions.textContent = currentUser.wonAuctions?.length || 0;
    if (userLevel) userLevel.textContent = currentUser.level || USER_CONFIG.DEFAULT_LEVEL;

    // 更新匿名开关状态
    const anonymousToggle = $('#anonymousToggle');
    if (anonymousToggle) {
        if (currentUser.isAnonymous === undefined) {
            currentUser.isAnonymous = false;
            userStorage.saveUser(currentUser, true);
            setState('currentUser', currentUser);
        }
        anonymousToggle.checked = currentUser.isAnonymous;
    }

    // 渲染竞拍历史
    const historyContainer = $('#bidHistoryList');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';

    if (!currentUser.bidHistory || currentUser.bidHistory.length === 0) {
        historyContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">暂无竞拍记录</p>';
        return;
    }

    const sortedHistory = [...currentUser.bidHistory].reverse();
    const auctions = getState('auctions');

    sortedHistory.forEach(bid => {
        const auction = auctions.find(a => a.id === bid.auctionId);
        if (!auction) return;

        const historyItem = document.createElement('div');
        historyItem.className = 'bid-history-item';
        historyItem.innerHTML = `
            <img src="${auction.image}" alt="${bid.title}" class="bid-history-image">
            <div class="bid-history-info">
                <div class="bid-history-title">${bid.title}</div>
                <div class="bid-history-details">
                    出价: ${formatCurrency(bid.amount)} |
                    状态: ${bid.status === 'won' ? '已赢得' : bid.status === 'active' ? '竞拍中' : '未中标'} |
                    时间: ${new Date(bid.time).toLocaleString()}
                </div>
            </div>
            <span class="auction-status status-${bid.status}">
                ${bid.status === 'won' ? '已赢得' : bid.status === 'active' ? '竞拍中' : '未中标'}
            </span>
        `;
        historyContainer.appendChild(historyItem);
    });
};

// 切换匿名模式
const toggleAnonymous = () => {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    const anonymousToggle = $('#anonymousToggle');
    if (!anonymousToggle) return;

    const isChecked = anonymousToggle.checked;
    currentUser.isAnonymous = isChecked;
    userStorage.saveUser(currentUser, true);
    setState('currentUser', currentUser);

    if (isChecked) {
        showAchievement('🔒 已启用匿名模式，您的名字将显示为"神秘玩家"');
    } else {
        showAchievement('🔓 已关闭匿名模式，您的名字将正常显示');
    }
};

// ==================== 分享功能 ====================

const shareAuction = async (auctionId) => {
    const auction = getAuction(auctionId);
    if (!auction) return;

    // 生成分享链接
    const currentUrl = window.location.href.split('?')[0];
    const shareUrl = `${currentUrl}?auction=${auctionId}`;

    // 使用工具函数复制
    const success = await copyToClipboard(shareUrl);
    if (success) {
        showAchievement(`📋 链接已复制到剪贴板！\n《${auction.title}》`);
    } else {
        prompt('请手动复制以下链接:', shareUrl);
    }
};

// ==================== 历史记录页面 ====================

const renderHistory = () => {
    const listContainer = $('#historyList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';

    const history = getState('auctionHistory');

    // 计算统计数据
    const totalAuctions = history.length;
    const soldAuctions = history.filter(a => a.highestBidder && a.currentBid >= a.reservePrice);
    const totalVolume = soldAuctions.reduce((sum, a) => sum + a.currentBid, 0);
    const successRate = totalAuctions > 0 ? Math.round((soldAuctions.length / totalAuctions) * 100) : 0;

    const totalHistoryAuctions = $('#totalHistoryAuctions');
    const totalHistoryVolume = $('#totalHistoryVolume');
    const successRateEl = $('#successRate');
    
    if (totalHistoryAuctions) totalHistoryAuctions.textContent = totalAuctions;
    if (totalHistoryVolume) totalHistoryVolume.textContent = formatCurrency(totalVolume);
    if (successRateEl) successRateEl.textContent = `${successRate}%`;

    if (history.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">暂无历史记录</p>';
        return;
    }

    // 按时间倒序排列
    const sortedHistory = [...history].reverse();

    sortedHistory.forEach(auction => {
        const isSold = auction.highestBidder && auction.currentBid >= auction.reservePrice;
        const liveTag = auction.isLive ? ' <span style="color:var(--warning);"><i class="fas fa-bolt"></i> 实时</span>' : '';

        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <img src="${auction.image}" alt="${auction.title}" class="history-item-image">
            <div class="history-item-info">
                <h3>${auction.title}${liveTag}</h3>
                <p>${auction.artist} | ${getCategoryName(auction.category)}</p>
                <p>起拍价: ${formatCurrency(auction.startPrice)} | 成交价: ${formatCurrency(auction.currentBid)}</p>
                <p>出价次数: ${auction.bidHistory.length} | 报名人数: ${auction.registeredUsers.length}</p>
                ${auction.highestBidder ? `<p>赢家: ${getDisplayName(auction.highestBidder)}</p>` : ''}
                <p style="font-size:0.85rem;color:var(--text-muted);">结束时间: ${new Date(auction.endTime).toLocaleString()}</p>
            </div>
            <div class="history-item-badge ${isSold ? 'badge-sold' : 'badge-unsold'}">
                ${isSold ? '成交' : '流拍'}
            </div>
        `;
        item.onclick = () => openHistoryDetail(auction);
        listContainer.appendChild(item);
    });
};

// 打开历史记录详情
const openHistoryDetail = (auction) => {
    const modal = $('#historyDetailModal');
    const title = $('#historyDetailTitle');
    const content = $('#historyDetailContent');
    
    if (!modal || !title || !content) return;

    const isSold = auction.highestBidder && auction.currentBid >= auction.reservePrice;
    const liveTag = auction.isLive ? ' <span style="color:var(--warning);"><i class="fas fa-bolt"></i> 实时</span>' : '';

    title.innerHTML = `${auction.title}${liveTag}`;

    // 生成出价记录HTML
    let bidHistoryHTML = '';
    if (auction.bidHistory && auction.bidHistory.length > 0) {
        bidHistoryHTML = auction.bidHistory
            .slice()
            .reverse()
            .map((bid, index) => `
                <div style="display:flex;justify-content:space-between;padding:0.75rem;background:${index % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'};border-radius:4px;">
                    <span>${getDisplayName(bid.user)}</span>
                    <span style="color:var(--primary);font-weight:600;">${formatCurrency(bid.amount)}</span>
                    <span style="color:var(--text-muted);font-size:0.85rem;">${new Date(bid.time).toLocaleString()}</span>
                </div>
            `)
            .join('');
    } else {
        bidHistoryHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">暂无出价记录</p>';
    }

    content.innerHTML = `
        <div style="display:grid;gap:1.5rem;">
            ${auction.image ? `
                <div style="text-align:center;">
                    <img src="${auction.image}" alt="${auction.title}"
                         style="max-width:100%;border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,0.3);">
                </div>
            ` : ''}

            <div style="background:var(--gradient-card);padding:1.5rem;border-radius:12px;">
                <h3 style="margin-bottom:1rem;color:var(--text-secondary);">
                    <i class="fas fa-info-circle"></i> 拍卖信息
                </h3>
                <div style="display:grid;gap:0.5rem;">
                    <p><strong>艺术家：</strong>${auction.artist}</p>
                    <p><strong>分类：</strong>${getCategoryName(auction.category)}</p>
                    ${auction.description ? `<p><strong>描述：</strong>${auction.description}</p>` : ''}
                    <p><strong>起拍价：</strong>${formatCurrency(auction.startPrice)}</p>
                    <p><strong>保留价：</strong>${formatCurrency(auction.reservePrice)}</p>
                    ${auction.isLive ? `<p><strong>拍卖类型：</strong><span style="color:var(--warning);"><i class="fas fa-bolt"></i> 实时竞拍</span></p>` : ''}
                    <p><strong>结束时间：</strong>${new Date(auction.endTime).toLocaleString()}</p>
                </div>
            </div>

            <div style="background:${isSold ? 'linear-gradient(135deg, rgba(78, 204, 163, 0.1), rgba(78, 204, 163, 0.05))' : 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.05))'};padding:1.5rem;border-radius:12px;border:1px solid ${isSold ? 'var(--success)' : 'var(--danger)'};">
                <h3 style="margin-bottom:1rem;color:${isSold ? 'var(--success)' : 'var(--danger)'};">
                    <i class="fas fa-${isSold ? 'check-circle' : 'times-circle'}"></i> ${isSold ? '成交信息' : '流拍'}
                </h3>
                ${isSold ? `
                    <div style="display:grid;gap:0.5rem;">
                        <p><strong>中拍者：</strong><span style="color:var(--success);">${getDisplayName(auction.highestBidder)}</span></p>
                        <p><strong>成交价：</strong><span style="color:var(--success);font-size:1.2rem;font-weight:600;">${formatCurrency(auction.currentBid)}</span></p>
                        <p><strong>出价次数：</strong>${auction.bidHistory.length} 次</p>
                        <p><strong>报名人数：</strong>${auction.registeredUsers.length} 人</p>
                    </div>
                ` : `
                    <p style="color:var(--text-muted);">此拍卖未达到保留价或无人出价，已流拍。</p>
                    <p style="margin-top:0.5rem;"><strong>出价次数：</strong>${auction.bidHistory.length} 次</p>
                    <p><strong>报名人数：</strong>${auction.registeredUsers.length} 人</p>
                `}
            </div>

            <div style="background:var(--gradient-card);padding:1.5rem;border-radius:12px;">
                <h3 style="margin-bottom:1rem;color:var(--text-secondary);">
                    <i class="fas fa-history"></i> 出价记录 (${auction.bidHistory.length})
                </h3>
                <div style="max-height:300px;overflow-y:auto;">
                    ${bidHistoryHTML}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
};

// 关闭历史记录详情
const closeHistoryDetail = () => {
    const modal = $('#historyDetailModal');
    if (modal) modal.style.display = 'none';
};

// ==================== 实时竞拍页面 ====================

const renderLivePage = () => {
    const liveAuctions = getState('auctions').filter(a => a.isLive && a.status === AUCTION_STATUS.ACTIVE);

    const statusContainer = $('#liveStatusText');
    const currentContainer = $('#currentLiveAuction');
    const upcomingContainer = $('#upcomingList');

    if (liveAuctions.length === 0) {
        if (statusContainer) statusContainer.textContent = '暂无进行中的实时竞拍';
        if (currentContainer) currentContainer.innerHTML = '';
        if (upcomingContainer) upcomingContainer.innerHTML = '';
        return;
    }

    // 显示当前实时竞拍
    const currentLive = liveAuctions[0];
    if (statusContainer) {
        statusContainer.innerHTML = `
            <span style="color:var(--success);">● 正在进行</span> | 竞拍阶段
        `;
    }

    const phaseMin = Math.floor(currentLive.livePhaseTime / 60);
    const phaseSec = currentLive.livePhaseTime % 60;

    if (currentContainer) {
        currentContainer.innerHTML = `
            <div class="auction-card" style="max-width:800px;margin:2rem auto;">
                <img src="${currentLive.image}" alt="${currentLive.title}" class="auction-image">
                <div class="auction-info">
                    <div class="auction-category">${getCategoryName(currentLive.category)} <i class="fas fa-bolt"></i> 实时竞拍</div>
                    <h3 class="auction-title">${currentLive.title}</h3>
                    <p class="auction-artist">${currentLive.artist}</p>
                    <div class="auction-price-info">
                        <div>
                            <div class="price-label">当前出价</div>
                            <div class="price-value">${formatCurrency(currentLive.currentBid)}</div>
                        </div>
                    </div>
                    <div class="auction-timer" style="font-size:1.2rem;margin-top:1rem;">
                        <i class="fas fa-clock"></i>
                        <span>竞拍时间: ${phaseMin}:${phaseSec.toString().padStart(2, '0')}</span>
                    </div>
                    <div style="margin-top:0.5rem;">
                        <small style="color:var(--text-muted);">已报名: ${currentLive.registeredUsers.length} 人</small>
                    </div>
                    <button class="btn-large" onclick="openAuctionDetail(${currentLive.id})" style="width:100%;margin-top:1rem;">
                        <i class="fas fa-gavel"></i> 参与竞拍
                    </button>
                </div>
            </div>
        `;
    }

    // 显示即将开始的
    const upcoming = liveAuctions.slice(1);
    if (upcomingContainer) {
        upcomingContainer.innerHTML = '';
        if (upcoming.length > 0) {
            upcoming.forEach(auction => {
                upcomingContainer.appendChild(createAuctionCard(auction));
            });
        }
    }
};

// ==================== 烟花动画 ====================

const playFireworks = (winnerName) => {
    const canvas = $('#fireworksCanvas');
    if (!canvas) return;
    
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const fireworks = [];
    const particles = [];

    class Firework {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            this.targetY = Math.random() * canvas.height * 0.5;
            this.speed = Math.random() * 3 + 2;
            this.angle = Math.PI / 2;
            this.gravity = 0.05;
            this.exploded = false;
            this.hue = Math.random() * 360;
        }

        update() {
            if (!this.exploded) {
                this.y -= this.speed;
                if (this.y <= this.targetY) {
                    this.exploded = true;
                    this.createParticles();
                }
            }
        }

        draw() {
            if (!this.exploded) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
                ctx.fill();
            }
        }

        createParticles() {
            for (let i = 0; i < 100; i++) {
                particles.push(new Particle(this.x, this.y, this.hue));
            }
        }
    }

    class Particle {
        constructor(x, y, hue) {
            this.x = x;
            this.y = y;
            this.hue = hue + Math.random() * 50 - 25;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 8 + 2;
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            this.gravity = 0.15;
            this.friction = 0.98;
            this.opacity = 1;
            this.decay = Math.random() * 0.03 + 0.01;
        }

        update() {
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.opacity -= this.decay;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
            ctx.fill();
            ctx.restore();
        }
    }

    let frameCount = 0;
    const animate = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 每30帧创建新烟花
        if (frameCount % 30 === 0 && fireworks.length < 5) {
            fireworks.push(new Firework());
        }

        fireworks.forEach((firework, index) => {
            firework.update();
            firework.draw();
            if (firework.exploded) {
                fireworks.splice(index, 1);
            }
        });

        particles.forEach((particle, index) => {
            particle.update();
            particle.draw();
            if (particle.opacity <= 0) {
                particles.splice(index, 1);
            }
        });

        frameCount++;

        if (frameCount < 300) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none';
        }
    };

    animate();
};

// ==================== 管理员功能（使用新模块） ====================

const openAdminModal = () => {
    const modal = $('#adminModal');
    if (modal) modal.style.display = 'block';
};

const closeAdminModal = () => {
    const modal = $('#adminModal');
    if (modal) modal.style.display = 'none';
    
    // 清空文件输入和预览
    const fileInput = $('#adminImageFile');
    const preview = $('#adminImagePreview');
    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
};

const openEditModal = (auctionId) => {
    const auction = getAuction(auctionId);
    if (!auction) return;

    // 填充表单
    const editAuctionId = $('#editAuctionId');
    const editTitle = $('#editTitle');
    const editArtist = $('#editArtist');
    const editCategory = $('#editCategory');
    const editImage = $('#editImage');
    const editDescription = $('#editDescription');
    const editStartPrice = $('#editStartPrice');
    const editReservePrice = $('#editReservePrice');
    const editStartTime = $('#editStartTime');
    const editEndTime = $('#editEndTime');

    if (editAuctionId) editAuctionId.value = auction.id;
    if (editTitle) editTitle.value = auction.title;
    if (editArtist) editArtist.value = auction.artist;
    if (editCategory) editCategory.value = auction.category;
    if (editImage) editImage.value = auction.image;
    if (editDescription) editDescription.value = auction.description;
    if (editStartPrice) editStartPrice.value = auction.startPrice;
    if (editReservePrice) editReservePrice.value = auction.reservePrice;

    // 填充时间
    if (editStartTime) {
        if (auction.scheduledStartTime) {
            const startDate = new Date(auction.scheduledStartTime);
            editStartTime.value = formatDateTimeLocal(startDate);
        } else {
            editStartTime.value = '';
        }
    }

    if (editEndTime) {
        if (auction.scheduledEndTime) {
            const endDate = new Date(auction.scheduledEndTime);
            editEndTime.value = formatDateTimeLocal(endDate);
        } else {
            editEndTime.value = '';
        }
    }

    const modal = $('#editModal');
    if (modal) modal.style.display = 'block';
};

const closeEditModal = () => {
    const modal = $('#editModal');
    if (modal) modal.style.display = 'none';
    
    // 清空文件输入和预览
    const fileInput = $('#editImageFile');
    const preview = $('#editImagePreview');
    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
};

const updateAuctionWrapper = () => {
    const editAuctionId = $('#editAuctionId');
    const editTitle = $('#editTitle');
    const editArtist = $('#editArtist');
    const editCategory = $('#editCategory');
    const editImage = $('#editImage');
    const editDescription = $('#editDescription');
    const editStartPrice = $('#editStartPrice');
    const editReservePrice = $('#editReservePrice');
    const editStartTime = $('#editStartTime');
    const editEndTime = $('#editEndTime');

    if (!editAuctionId || !editTitle || !editArtist || !editCategory || !editImage || 
        !editDescription || !editStartPrice || !editReservePrice) {
        showError('表单元素不存在');
        return;
    }

    const auctionId = parseInt(editAuctionId.value);
    const result = updateAuction(auctionId, {
        title: editTitle.value.trim(),
        artist: editArtist.value.trim(),
        category: editCategory.value,
        image: editImage.value.trim(),
        description: editDescription.value.trim(),
        startPrice: parseInt(editStartPrice.value),
        reservePrice: parseInt(editReservePrice.value),
        startTime: editStartTime?.value || '',
        endTime: editEndTime?.value || ''
    });

    if (result.success) {
        showAchievement(result.message);
        closeEditModal();
        batchDOMUpdate(() => {
            renderAdminPage();
            renderFeaturedAuctions();
            renderCatalog();
        });
    } else {
        showError(result.message);
    }
};

const publishAuctionWrapper = () => {
    const adminTitle = $('#adminTitle');
    const adminArtist = $('#adminArtist');
    const adminCategory = $('#adminCategory');
    const adminImage = $('#adminImage');
    const adminDescription = $('#adminDescription');
    const adminStartPrice = $('#adminStartPrice');
    const adminReservePrice = $('#adminReservePrice');
    const adminStartTime = $('#adminStartTime');
    const adminEndTime = $('#adminEndTime');

    if (!adminTitle || !adminArtist || !adminCategory || !adminImage || 
        !adminDescription || !adminStartPrice || !adminReservePrice) {
        showError('表单元素不存在');
        return;
    }

    const result = publishAuction({
        title: adminTitle.value.trim(),
        artist: adminArtist.value.trim(),
        category: adminCategory.value,
        image: adminImage.value.trim(),
        description: adminDescription.value.trim(),
        startPrice: parseInt(adminStartPrice.value),
        reservePrice: parseInt(adminReservePrice.value),
        startTime: adminStartTime?.value || '',
        endTime: adminEndTime?.value || ''
    });

    if (result.success) {
        // 清空表单
        adminTitle.value = '';
        adminArtist.value = '';
        adminImage.value = '';
        adminDescription.value = '';
        adminStartPrice.value = '';
        adminReservePrice.value = '';
        if (adminStartTime) adminStartTime.value = '';
        if (adminEndTime) adminEndTime.value = '';

        showAchievement(result.message);
        closeAdminModal();
        batchDOMUpdate(() => {
            renderAdminPage();
            renderFeaturedAuctions();
        });
    } else {
        showError(result.message);
    }
};

const publishLiveAuctionWrapper = () => {
    const liveTitle = $('#liveTitle');
    const liveArtist = $('#liveArtist');
    const liveCategory = $('#liveCategory');
    const liveImage = $('#liveImage');
    const liveDescription = $('#liveDescription');
    const liveStartPrice = $('#liveStartPrice');
    const liveReservePrice = $('#liveReservePrice');
    const liveDuration = $('#liveDuration');

    if (!liveTitle || !liveArtist || !liveCategory || !liveImage || 
        !liveDescription || !liveStartPrice || !liveReservePrice) {
        showError('表单元素不存在');
        return;
    }

    const result = publishLiveAuction({
        title: liveTitle.value.trim(),
        artist: liveArtist.value.trim(),
        category: liveCategory.value,
        image: liveImage.value.trim(),
        description: liveDescription.value.trim(),
        startPrice: parseInt(liveStartPrice.value),
        reservePrice: parseInt(liveReservePrice.value),
        duration: parseInt(liveDuration?.value) || 3
    });

    if (result.success) {
        // 清空表单
        liveTitle.value = '';
        liveArtist.value = '';
        liveImage.value = '';
        liveDescription.value = '';
        liveStartPrice.value = '';
        liveReservePrice.value = '';
        if (liveDuration) liveDuration.value = '3';

        showAchievement(result.message);
        closeLiveAuctionModal();
        batchDOMUpdate(() => {
            renderAdminPage();
            renderFeaturedAuctions();
            renderLivePage();
        });
    } else {
        showError(result.message);
    }
};

const startLiveAuctionWrapper = (auctionId) => {
    const result = startLiveAuction(auctionId);
    if (result.success) {
        showAchievement(result.message);
        batchDOMUpdate(() => {
            renderAdminPage();
            renderLivePage();
        });
    } else {
        showError(result.message);
    }
};

const deleteAuctionWrapper = (auctionId) => {
    if (!confirm('确定要删除这件拍卖品吗？')) return;

    const result = deleteAuction(auctionId);
    if (result.success) {
        showAchievement(result.message);
        batchDOMUpdate(() => {
            renderAdminPage();
            renderFeaturedAuctions();
        });
    } else {
        showError(result.message);
    }
};

const openLiveAuctionModal = () => {
    const modal = $('#liveAuctionModal');
    if (modal) modal.style.display = 'block';
};

const closeLiveAuctionModal = () => {
    const modal = $('#liveAuctionModal');
    if (modal) modal.style.display = 'none';
    
    // 清空文件输入和预览
    const fileInput = $('#liveImageFile');
    const preview = $('#liveImagePreview');
    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
};

// ==================== 网站设置功能 ====================

const applyTheme = (themeName) => {
    const theme = THEME_PRESETS[themeName];
    if (!theme) return;

    // 更新表单值
    const bgType = $('#bgType');
    const gradientStart = $('#gradientStart');
    const gradientMid = $('#gradientMid');
    const gradientEnd = $('#gradientEnd');
    const primaryColor = $('#primaryColor');
    const secondaryColor = $('#secondaryColor');
    const accentColor = $('#accentColor');

    if (bgType) bgType.value = theme.bgType;
    if (gradientStart) gradientStart.value = theme.gradientStart;
    if (gradientMid) gradientMid.value = theme.gradientMid;
    if (gradientEnd) gradientEnd.value = theme.gradientEnd;
    if (primaryColor) primaryColor.value = theme.primaryColor;
    if (secondaryColor) secondaryColor.value = theme.secondaryColor;
    if (accentColor) accentColor.value = theme.accentColor;

    // 立即应用
    applySettings();

    // 更新预览信息
    const currentTheme = $('#currentTheme');
    if (currentTheme) currentTheme.textContent = theme.name;

    showAchievement(`已应用主题：${theme.name}`);
};

const applySettings = () => {
    const bgTypeEl = $('#bgType');
    const gradientStartEl = $('#gradientStart');
    const gradientMidEl = $('#gradientMid');
    const gradientEndEl = $('#gradientEnd');
    const solidColorEl = $('#solidColor');
    const bgImageUrlEl = $('#bgImageUrl');
    const primaryColorEl = $('#primaryColor');
    const secondaryColorEl = $('#secondaryColor');
    const accentColorEl = $('#accentColor');
    const successColorEl = $('#successColor');
    const dangerColorEl = $('#dangerColor');
    const warningColorEl = $('#warningColor');
    const siteNameEl = $('#siteName');
    const heroTitleEl = $('#heroTitle');
    const heroSubtitleEl = $('#heroSubtitle');
    const heroButtonTextEl = $('#heroButtonText');
    const featuredTitleEl = $('#featuredTitle');
    const featuredSubtitleEl = $('#featuredSubtitle');
    const cardRadiusEl = $('#cardRadius');
    const cardGapEl = $('#cardGap');
    const titleSizeEl = $('#titleSize');
    const bodySizeEl = $('#bodySize');
    const shadowIntensityEl = $('#shadowIntensity');
    const animationSpeedEl = $('#animationSpeed');
    const gridColumnsEl = $('#gridColumns');
    const navStyleEl = $('#navStyle');
    const hoverEffectEl = $('#hoverEffect');
    const heroImageEl = $('#heroImage');
    const footerColorEl = $('#footerColor');
    const customCSSEl = $('#customCSS');

    if (!bgTypeEl || !gradientStartEl || !gradientMidEl || !gradientEndEl || 
        !solidColorEl || !bgImageUrlEl || !primaryColorEl || !secondaryColorEl || 
        !accentColorEl || !successColorEl || !dangerColorEl || !warningColorEl ||
        !siteNameEl || !heroTitleEl || !heroSubtitleEl || !heroButtonTextEl ||
        !featuredTitleEl || !featuredSubtitleEl || !cardRadiusEl || !cardGapEl ||
        !titleSizeEl || !bodySizeEl || !shadowIntensityEl || !animationSpeedEl ||
        !gridColumnsEl || !navStyleEl || !hoverEffectEl || !heroImageEl ||
        !footerColorEl || !customCSSEl) {
        return; // 设置页面未加载
    }

    const settings = {
        bgType: bgTypeEl.value,
        gradientStart: gradientStartEl.value,
        gradientMid: gradientMidEl.value,
        gradientEnd: gradientEndEl.value,
        solidColor: solidColorEl.value,
        bgImageUrl: bgImageUrlEl.value,
        primaryColor: primaryColorEl.value,
        secondaryColor: secondaryColorEl.value,
        accentColor: accentColorEl.value,
        successColor: successColorEl.value,
        dangerColor: dangerColorEl.value,
        warningColor: warningColorEl.value,
        siteName: siteNameEl.value,
        heroTitle: heroTitleEl.value,
        heroSubtitle: heroSubtitleEl.value,
        heroButtonText: heroButtonTextEl.value,
        featuredTitle: featuredTitleEl.value,
        featuredSubtitle: featuredSubtitleEl.value,
        cardRadius: cardRadiusEl.value,
        cardGap: cardGapEl.value,
        titleSize: titleSizeEl.value,
        bodySize: bodySizeEl.value,
        shadowIntensity: shadowIntensityEl.value,
        animationSpeed: animationSpeedEl.value,
        gridColumns: gridColumnsEl.value,
        navStyle: navStyleEl.value,
        hoverEffect: hoverEffectEl.value,
        heroImage: heroImageEl.value,
        footerColor: footerColorEl.value,
        customCSS: customCSSEl.value
    };

    // 保存设置
    settingsStorage.saveSettings(settings, true);

    // 应用背景
    if (settings.bgType === 'gradient') {
        document.body.style.background = `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientMid} 50%, ${settings.gradientEnd} 100%)`;
        document.body.style.backgroundAttachment = 'fixed';
        const currentBgType = $('#currentBgType');
        if (currentBgType) currentBgType.textContent = '渐变色';
    } else if (settings.bgType === 'solid') {
        document.body.style.background = settings.solidColor;
        const currentBgType = $('#currentBgType');
        if (currentBgType) currentBgType.textContent = '纯色';
    } else if (settings.bgType === 'image' && settings.bgImageUrl) {
        document.body.style.background = `url(${settings.bgImageUrl}) center/cover fixed`;
        const currentBgType = $('#currentBgType');
        if (currentBgType) currentBgType.textContent = '图片';
    }

    // 应用主题配色
    document.documentElement.style.setProperty('--accent-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--accent-secondary', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-gold', settings.accentColor);
    document.documentElement.style.setProperty('--success', settings.successColor);
    document.documentElement.style.setProperty('--danger', settings.dangerColor);
    document.documentElement.style.setProperty('--warning', settings.warningColor);
    document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`);

    // 应用文案
    document.querySelectorAll('.nav-brand span').forEach(el => el.textContent = settings.siteName);
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = settings.heroTitle;
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = settings.heroSubtitle;
    const heroButton = document.querySelector('.hero .btn-large');
    if (heroButton) heroButton.textContent = settings.heroButtonText;

    // 更新精选区域标题
    const featuredTitleElement = document.querySelector('.featured-section .section-title');
    if (featuredTitleElement) featuredTitleElement.textContent = settings.featuredTitle;
    const featuredSubtitleElement = document.querySelector('.featured-section .section-subtitle');
    if (featuredSubtitleElement) featuredSubtitleElement.textContent = settings.featuredSubtitle;

    // 应用排版
    let styleSheet = document.getElementById('dynamicStyles');
    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'dynamicStyles';
        document.head.appendChild(styleSheet);
    }

    styleSheet.textContent = `
        .auction-card { border-radius: ${settings.cardRadius}px !important; }
        .auction-grid { gap: ${settings.cardGap}px !important; }
        .hero-title { font-size: ${settings.titleSize}px !important; }
        body { font-size: ${settings.bodySize}px !important; }

        ${settings.shadowIntensity === 'none' ? '.auction-card { box-shadow: none !important; }' : ''}
        ${settings.shadowIntensity === 'light' ? '.auction-card { box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important; }' : ''}
        ${settings.shadowIntensity === 'strong' ? '.auction-card { box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; }' : ''}

        ${settings.animationSpeed === 'slow' ? '* { transition-duration: 0.5s !important; }' : ''}
        ${settings.animationSpeed === 'fast' ? '* { transition-duration: 0.15s !important; }' : ''}

        .auction-grid { grid-template-columns: repeat(${settings.gridColumns}, 1fr) !important; }
    `;

    // 应用自定义CSS
    let customStyleTag = document.getElementById('customStyles');
    if (settings.customCSS) {
        if (!customStyleTag) {
            customStyleTag = document.createElement('style');
            customStyleTag.id = 'customStyles';
            document.head.appendChild(customStyleTag);
        }
        customStyleTag.textContent = settings.customCSS;
    } else if (customStyleTag) {
        customStyleTag.remove();
    }

    // 更新保存提示
    const lastSaved = $('#lastSaved');
    if (lastSaved) lastSaved.textContent = '已保存';
};

const resetSettings = () => {
    if (!confirm('确定要重置所有设置为默认值吗？')) return;
    settingsStorage.saveSettings(null, true);
    location.reload();
};

const exportSettings = () => {
    const settings = settingsStorage.getSettings();
    if (!settings) {
        showError('暂无保存的设置');
        return;
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auction-site-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAchievement('📥 配置文件已导出');
};

const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            settingsStorage.saveSettings(settings, true);
            showSuccess('✅ 配置导入成功，页面即将刷新...');
            setTimeout(() => location.reload(), 2000);
        } catch (error) {
            showError('配置文件格式错误');
            logger.error('导入设置失败', error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

const toggleBgOptions = () => {
    const bgType = $('#bgType');
    if (!bgType) return;

    const gradientOptions = $('#gradientOptions');
    const solidOptions = $('#solidOptions');
    const imageOptions = $('#imageOptions');

    if (gradientOptions) gradientOptions.style.display = bgType.value === 'gradient' ? 'block' : 'none';
    if (solidOptions) solidOptions.style.display = bgType.value === 'solid' ? 'block' : 'none';
    if (imageOptions) imageOptions.style.display = bgType.value === 'image' ? 'block' : 'none';
};

const updateRangeValue = (input) => {
    const valueSpan = input.nextElementSibling;
    if (valueSpan && valueSpan.classList.contains('range-value')) {
        valueSpan.textContent = input.value + 'px';
    }
};

const initSettingsPage = () => {
    const saved = settingsStorage.getSettings();
    if (saved) {
        // 填充表单
        Object.keys(saved).forEach(key => {
            const element = $(`#${key}`);
            if (element) {
                element.value = saved[key];
            }
        });

        const lastSaved = $('#lastSaved');
        if (lastSaved) lastSaved.textContent = '已保存';
    }

    // 添加实时预览
    const inputs = document.querySelectorAll('#settingsPage input, #settingsPage select, #settingsPage textarea');
    inputs.forEach(input => {
        if (input.type !== 'file') {
            input.addEventListener('change', () => {
                applySettings();
            });
        }
    });
};

// ==================== 数据管理功能 ====================

const exportAllData = () => {
    const allData = {
        auctions: getState('auctions'),
        auctionHistory: getState('auctionHistory'),
        users: userStorage.getUsers(),
        lastUser: userStorage.getLastUser(),
        siteSettings: settingsStorage.getSettings(),
        exportTime: new Date().toISOString(),
        version: '2.0.0'
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auction-data-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAchievement('📥 数据已成功导出！');
};

const importAllData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.auctions || !Array.isArray(data.auctions)) {
                showError('❌ 数据格式错误：缺少拍卖品数据');
                return;
            }

            const confirmMsg = `确定要导入数据吗？\n\n将导入：\n- ${data.auctions.length} 件拍卖品\n- ${data.auctionHistory?.length || 0} 条历史记录\n- ${data.users?.length || 0} 个用户账户\n\n⚠️ 当前数据将被覆盖！`;

            if (!confirm(confirmMsg)) {
                return;
            }

            // 导入数据
            setState('auctions', data.auctions);
            setState('auctionHistory', data.auctionHistory || []);
            auctionStorage.saveAuctions(data.auctions, true);
            historyStorage.saveHistory(data.auctionHistory || [], true);

            if (data.users) {
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
            }
            if (data.lastUser) {
                localStorage.setItem(STORAGE_KEYS.LAST_USER, data.lastUser);
            }
            if (data.siteSettings) {
                settingsStorage.saveSettings(data.siteSettings, true);
            }

            showSuccess('✅ 数据导入成功！页面即将刷新...');
            setTimeout(() => location.reload(), 2000);

        } catch (error) {
            showError(`❌ 导入失败：文件格式错误\n\n${error.message}`);
            logger.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

const clearAllData = () => {
    const confirmMsg = '⚠️ 确定要清空所有数据吗？\n\n这将删除：\n- 所有拍卖品\n- 所有历史记录\n- 所有用户账户\n- 所有网站设置\n\n此操作无法撤销！建议先导出数据备份。';

    if (!confirm(confirmMsg)) {
        return;
    }

    const finalConfirm = prompt('请输入 "确认清空" 以继续（输入后所有数据将被永久删除）：');
    if (finalConfirm !== '确认清空') {
        showError('❌ 操作已取消');
        return;
    }

    // 清空localStorage
    localStorage.clear();

    // 重置应用状态
    setState('auctions', []);
    setState('auctionHistory', []);
    setState('currentUser', null);

    showSuccess('✅ 所有数据已清空，页面即将刷新...');
    setTimeout(() => location.reload(), 2000);
};

// ==================== 模态框关闭处理 ====================

window.onclick = (event) => {
    const authModal = $('#authModal');
    const auctionModal = $('#auctionModal');
    const registrationModal = $('#registrationModal');
    const adminModal = $('#adminModal');
    const editModal = $('#editModal');
    const liveAuctionModal = $('#liveAuctionModal');
    const historyDetailModal = $('#historyDetailModal');

    if (event.target === authModal) closeAuthModal();
    if (event.target === auctionModal) closeAuctionModal();
    if (event.target === registrationModal) closeRegistrationModal();
    if (event.target === adminModal) closeAdminModal();
    if (event.target === editModal) closeEditModal();
    if (event.target === liveAuctionModal) closeLiveAuctionModal();
    if (event.target === historyDetailModal) closeHistoryDetail();
};

// 点击关闭按钮
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = function() {
        closeAuthModal();
        closeAuctionModal();
        closeRegistrationModal();
        closeAdminModal();
        closeEditModal();
        closeLiveAuctionModal();
        closeHistoryDetail();
    };
});

// ==================== 初始化应用 ====================

const initApp = async () => {
    // 初始化云存储（如果已配置）
    const cloudEnabled = await initCloudStorage();
    if (cloudEnabled) {
        logger.info('✅ 云存储已启用，数据将实时同步');
        // 从云端加载数据
        await loadFromCloud();
    } else {
        logger.info('ℹ️ 使用本地存储（未配置云存储）');
    }

    // 清理旧的 via.placeholder.com 链接（自动修复）
    const auctions = auctionStorage.getAuctions();
    if (auctions.some(a => a.image && a.image.includes('via.placeholder.com'))) {
        logger.info('🔧 正在清理旧的占位符图片链接...');
    }

    // 初始化拍卖品数据
    initAuctions();

    // 检查本地存储的登录状态
    const lastUser = userStorage.getLastUser();
    if (lastUser) {
        const user = userStorage.getUser(lastUser);
        if (user) {
            setState('currentUser', user);
            updateUserUI();
        }
    }

    // 渲染首页
    renderFeaturedAuctions();

    // 启动倒计时系统
    startCountdown();

    // 定期触发随机AI竞价
    timerManager.setInterval('ai-bid-random', () => {
        const activeAuctions = getState('auctions').filter(a => a.status === AUCTION_STATUS.ACTIVE);
        if (activeAuctions.length > 0) {
            const randomAuction = activeAuctions[Math.floor(Math.random() * activeAuctions.length)];
            const aiResult = triggerAIBid(randomAuction.id);
            if (aiResult && getState('currentUser')) {
                showInfo(aiResult.message);
                batchDOMUpdate(() => {
                    renderFeaturedAuctions();
                    renderCatalog();
                });
            }
        }
    }, AUCTION_CONFIG.AI_BID_CHECK_INTERVAL);

    // 检查URL参数，如果有分享的拍卖ID，自动打开详情
    const urlParams = new URLSearchParams(window.location.search);
    const sharedAuctionId = urlParams.get('auction');
    if (sharedAuctionId) {
        const auctionId = parseInt(sharedAuctionId);
        const auction = getAuction(auctionId);
        if (auction) {
            timerManager.setTimeout('open-shared-auction', () => {
                openAuctionDetail(auctionId);
                showAchievement(`📢 已打开分享的拍卖：《${auction.title}》`);
            }, 500);
        }
    }

    logger.info('🎨 臻藏拍卖系统已初始化');
    logger.info('💡 提示：使用用户名 "admin" 注册可获得管理员权限');
};

// ==================== 加载设置 ====================

// 应用加载的设置
const applyLoadedSettings = (settings) => {
    // 应用背景
    if (settings.bgType === 'gradient') {
        document.body.style.background = `linear-gradient(135deg, ${settings.gradientStart} 0%, ${settings.gradientMid} 50%, ${settings.gradientEnd} 100%)`;
        document.body.style.backgroundAttachment = 'fixed';
    } else if (settings.bgType === 'solid') {
        document.body.style.background = settings.solidColor;
    } else if (settings.bgType === 'image' && settings.bgImageUrl) {
        document.body.style.background = `url(${settings.bgImageUrl}) center/cover fixed`;
    }

    // 应用配色
    if (settings.primaryColor) {
        document.documentElement.style.setProperty('--accent-primary', settings.primaryColor);
        document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`);
    }

    // 应用文案
    if (settings.siteName) {
        const brandElements = document.querySelectorAll('.nav-brand span');
        brandElements.forEach(el => el.textContent = settings.siteName);
    }

    if (settings.heroTitle) {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) heroTitle.textContent = settings.heroTitle;
    }

    if (settings.heroSubtitle) {
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) heroSubtitle.textContent = settings.heroSubtitle;
    }

    // 应用排版
    if (settings.cardRadius) {
        document.documentElement.style.setProperty('--card-radius', settings.cardRadius + 'px');
    }

    // 应用自定义CSS
    if (settings.customCSS) {
        let styleTag = document.getElementById('customStyles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'customStyles';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = settings.customCSS;
    }
};

const loadSettings = () => {
    const saved = settingsStorage.getSettings();
    if (saved) {
        applyLoadedSettings(saved);
    }
};

// ==================== 导出全局函数（向后兼容） ====================

// 将所有函数导出到window对象，保持向后兼容
if (typeof window !== 'undefined') {
    // 认证相关
    window.login = login;
    window.register = register;
    window.logout = logout;
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    window.showLogin = showLogin;
    window.showRegister = showRegister;
    window.updateUserUI = updateUserUI;
    window.isAdmin = isAdmin;
    window.getDisplayName = getDisplayName;
    window.toggleAnonymous = toggleAnonymous;

    // 页面切换
    window.showPage = showPageWrapper;

    // 拍卖相关
    window.openAuctionDetail = openAuctionDetail;
    window.closeAuctionModal = closeAuctionModal;
    window.placeBid = placeBid;
    window.toggleLike = toggleLike;
    window.filterAuctions = filterAuctions;
    window.renderFeaturedAuctions = renderFeaturedAuctions;
    window.renderCatalog = renderCatalog;

    // 报名相关
    window.openRegistrationModal = openRegistrationModal;
    window.closeRegistrationModal = closeRegistrationModal;
    window.quickRegister = quickRegister;
    window.showManualRegistration = showManualRegistration;
    window.manualRegister = manualRegister;

    // 历史记录
    window.renderHistory = renderHistory;
    window.openHistoryDetail = openHistoryDetail;
    window.closeHistoryDetail = closeHistoryDetail;

    // 实时竞拍
    window.renderLivePage = renderLivePage;

    // 管理员功能
    window.openAdminModal = openAdminModal;
    window.closeAdminModal = closeAdminModal;
    window.openEditModal = openEditModal;
    window.closeEditModal = closeEditModal;
    window.updateAuction = updateAuctionWrapper;
    window.publishAuction = publishAuctionWrapper;
    window.publishLiveAuction = publishLiveAuctionWrapper;
    window.startLiveAuction = startLiveAuctionWrapper;
    window.deleteAuction = deleteAuctionWrapper;
    window.renderAdminPage = renderAdminPage;
    window.switchAdminTab = switchAdminTab;
    window.previewImage = previewImage;
    window.openLiveAuctionModal = openLiveAuctionModal;
    window.closeLiveAuctionModal = closeLiveAuctionModal;

    // 设置相关
    window.applyTheme = applyTheme;
    window.applySettings = applySettings;
    window.resetSettings = resetSettings;
    window.exportSettings = exportSettings;
    window.importSettings = importSettings;
    window.toggleBgOptions = toggleBgOptions;
    window.updateRangeValue = updateRangeValue;
    window.initSettingsPage = initSettingsPage;

    // 数据管理
    window.exportAllData = exportAllData;
    window.importAllData = importAllData;
    window.clearAllData = clearAllData;

    // 分享
    window.shareAuction = shareAuction;

    // 烟花
    window.playFireworks = playFireworks;

    // 我的竞拍
    window.renderMyBids = renderMyBids;

    // 保持AppState可用
    window.AppState = AppState;
}

// ==================== 页面加载完成后初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadSettings();
});

