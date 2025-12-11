/**
 * UI渲染模块
 * 处理所有UI渲染和页面切换
 */

import { getState } from './state.js';
import { getCategoryName, formatTime, formatCurrency, $, debounce } from './utils.js';
import { getAuction, isRegistered, isLiked } from './auction.js';
import { getDisplayName } from './auth.js';
import { AUCTION_CONFIG, AUCTION_STATUS } from './constants.js';
import { batchDOMUpdate, addLazyLoad } from './performance.js';
import logger from './logger.js';

/**
 * 页面管理器
 */
class PageManager {
    constructor() {
        this.currentPage = 'home';
        this.pageCallbacks = new Map();
    }

    /**
     * 显示指定页面
     * @param {string} pageName - 页面名称
     */
    show(pageName) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = $(`#${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;
        }

        // 更新导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // 触发页面回调
        if (this.pageCallbacks.has(pageName)) {
            this.pageCallbacks.get(pageName)();
        }

        logger.debug('页面切换', { from: this.currentPage, to: pageName });
    }

    /**
     * 注册页面回调
     * @param {string} pageName - 页面名称
     * @param {Function} callback - 回调函数
     */
    onPageShow(pageName, callback) {
        this.pageCallbacks.set(pageName, callback);
    }

    /**
     * 获取当前页面
     * @returns {string} 当前页面名称
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// 创建页面管理器实例
const pageManager = new PageManager();

/**
 * 创建拍卖品卡片
 * @param {Object} auction - 拍卖品对象
 * @returns {HTMLElement} 卡片元素
 */
export function createAuctionCard(auction) {
    const card = document.createElement('div');
    card.className = 'auction-card';
    card.setAttribute('data-auction-id', auction.id);

    const timeDisplay = formatTime(auction.timeLeft || 0);
    const isUrgent = auction.timeLeft < 60;
    const currentUser = getState('currentUser');
    const registered = isRegistered(auction.id);
    const liked = isLiked(auction.id);
    const likesCount = auction.likesCount || 0;

    // 确定状态文本
    let statusText = '';
    let statusClass = auction.status;
    if (auction.status === AUCTION_STATUS.PENDING) {
        statusText = '等待开始';
    } else if (auction.status === AUCTION_STATUS.ACTIVE) {
        statusText = '竞拍中';
    } else {
        statusText = '已结束';
    }

    // 是否可以报名
    const canRegister = auction.status === AUCTION_STATUS.ACTIVE || 
                       (auction.status === AUCTION_STATUS.PENDING && auction.isLive);

    card.innerHTML = `
        <img src="${auction.image}" alt="${auction.title}" class="auction-image">
        <div class="auction-info">
            <div class="auction-category">
                ${getCategoryName(auction.category)}${auction.isLive ? ' <i class="fas fa-bolt"></i>' : ''}
            </div>
            <h3 class="auction-title">${auction.title}</h3>
            <p class="auction-artist">${auction.artist}</p>
            <div class="auction-price-info">
                <div>
                    <div class="price-label">当前出价</div>
                    <div class="price-value">${formatCurrency(auction.currentBid)}</div>
                </div>
            </div>
            ${auction.status === AUCTION_STATUS.ACTIVE ? `
                <div class="auction-timer ${isUrgent ? 'timer-urgent' : ''}">
                    <i class="fas fa-clock"></i>
                    <span data-timer="${auction.id}">${timeDisplay}</span>
                    ${auction.extendedTime > 0 ? '<span style="color:var(--warning);margin-left:0.5rem;">(延时中)</span>' : ''}
                </div>
                <div style="margin-top:0.5rem;">
                    <small style="color:var(--text-muted);">已报名: ${auction.registeredUsers.length} 人</small>
                </div>
            ` : auction.status === AUCTION_STATUS.PENDING && auction.isLive ? `
                <div style="margin-top:0.5rem;">
                    <small style="color:var(--warning);">
                        <i class="fas fa-clock"></i> 实时竞拍等待开始，现在可以报名
                    </small>
                </div>
                <div style="margin-top:0.5rem;">
                    <small style="color:var(--text-muted);">已报名: ${auction.registeredUsers.length} 人</small>
                </div>
            ` : auction.status === AUCTION_STATUS.PENDING ? `
                <div style="margin-top:0.5rem;">
                    <small style="color:var(--text-muted);">
                        <i class="fas fa-clock"></i> 报名阶段，拍卖即将开始
                    </small>
                </div>
                <div style="margin-top:0.5rem;">
                    <small style="color:var(--text-muted);">已报名: ${auction.registeredUsers.length} 人</small>
                </div>
            ` : ''}
            <span class="auction-status status-${statusClass}">
                ${statusText}
            </span>
            ${!registered && canRegister ? `
                <button class="btn-primary" onclick="event.stopPropagation(); window.openRegistrationModal(${auction.id})" style="width:100%;margin-top:0.5rem;">
                    <i class="fas fa-user-plus"></i> 立即报名
                </button>
            ` : registered && auction.status === AUCTION_STATUS.ACTIVE ? `
                <button class="btn-large" onclick="window.openAuctionDetail(${auction.id})" style="width:100%;margin-top:0.5rem;background:var(--gradient-success);">
                    <i class="fas fa-gavel"></i> 参加竞拍
                </button>
            ` : registered && auction.status === AUCTION_STATUS.PENDING ? `
                <span style="color:var(--success);font-size:0.9rem;display:block;margin-top:0.5rem;">
                    <i class="fas fa-check-circle"></i> 已报名，等待开始
                </span>
            ` : ''}
            ${!auction.isLive ? `
                <div class="auction-like" onclick="event.stopPropagation(); window.toggleLike(${auction.id})" style="display:flex;align-items:center;justify-content:flex-end;margin-top:0.75rem;cursor:pointer;gap:0.5rem;">
                    <i class="${liked ? 'fas' : 'far'} fa-heart" style="color:${liked ? 'var(--danger)' : 'var(--text-muted)'};font-size:1.2rem;transition:all 0.3s ease;"></i>
                    <span style="color:var(--text-secondary);font-size:0.9rem;">${likesCount}</span>
                </div>
            ` : ''}
        </div>
    `;

    card.onclick = () => {
        if (window.openAuctionDetail) {
            window.openAuctionDetail(auction.id);
        }
    };

    return card;
}

/**
 * 渲染精选拍卖（性能优化版本）
 */
export function renderFeaturedAuctions() {
    batchDOMUpdate(() => {
        const container = $('#featuredItems');
        if (!container) return;

        container.innerHTML = '';
        const auctions = getState('auctions');

    // 获取所有普通拍卖（非实时），按点赞数排序，取前3名
    const topLiked = auctions
        .filter(a => !a.isLive && (a.status === AUCTION_STATUS.ACTIVE || a.status === AUCTION_STATUS.PENDING))
        .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
        .slice(0, 3);

    // 获取其他进行中的拍卖（包括实时拍卖），填充到6个
    const topLikedIds = topLiked.map(a => a.id);
    const otherActive = auctions
        .filter(a => (a.status === AUCTION_STATUS.ACTIVE || (a.status === AUCTION_STATUS.PENDING && a.isLive)) && !topLikedIds.includes(a.id))
        .slice(0, 6 - topLiked.length);

    // 合并：前3名点赞 + 其他进行中的拍卖
    const featured = [...topLiked, ...otherActive];

        featured.forEach(auction => {
            const card = createAuctionCard(auction);
            container.appendChild(card);
            
            // 添加图片懒加载
            const img = card.querySelector('.auction-image');
            if (img && auction.image) {
                addLazyLoad(img, auction.image);
            }
        });

        if (featured.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">暂无进行中的拍卖</p>';
        }
    });
}

/**
 * 渲染拍卖目录（性能优化版本）
 * @param {Object} filters - 筛选条件
 */
export function renderCatalog(filters = {}) {
    batchDOMUpdate(() => {
        const container = $('#catalogItems');
        if (!container) return;

        container.innerHTML = '';
        const auctions = getState('auctions');

    let filtered = auctions.filter(auction => {
        if (filters.category && filters.category !== 'all' && auction.category !== filters.category) {
            return false;
        }

        if (filters.status && filters.status !== 'all' && auction.status !== filters.status) {
            return false;
        }

        if (filters.priceRange && filters.priceRange !== 'all') {
            const [min, max] = filters.priceRange.split('-').map(v => v.replace('+', ''));
            if (max) {
                if (auction.currentBid < parseInt(min) || auction.currentBid > parseInt(max)) {
                    return false;
                }
            } else {
                if (auction.currentBid < parseInt(min)) {
                    return false;
                }
            }
        }

        return true;
    });

        filtered.forEach(auction => {
            const card = createAuctionCard(auction);
            container.appendChild(card);
            
            // 添加图片懒加载
            const img = card.querySelector('.auction-image');
            if (img && auction.image) {
                addLazyLoad(img, auction.image);
            }
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">没有找到符合条件的拍卖品</p>';
        }
    });
}

/**
 * 更新倒计时显示
 * @param {number} auctionId - 拍卖品ID
 * @param {number} timeLeft - 剩余时间（秒）
 */
export function updateTimerDisplay(auctionId, timeLeft) {
    const timerElement = document.querySelector(`[data-timer="${auctionId}"]`);
    if (timerElement) {
        timerElement.textContent = formatTime(timeLeft);
        
        // 更新详情页计时器
        const detailTimer = $('#detailTimer');
        if (detailTimer && getAuction(auctionId)?.status === AUCTION_STATUS.ACTIVE) {
            detailTimer.textContent = formatTime(timeLeft);
        }
    }
}

/**
 * 更新当前出价显示
 * @param {number} auctionId - 拍卖品ID
 * @param {number} amount - 出价金额
 */
export function updateBidDisplay(auctionId, amount) {
    const bidElement = $('#detailCurrentBid');
    if (bidElement) {
        bidElement.textContent = formatCurrency(amount);
    }

    // 更新卡片中的价格
    const card = document.querySelector(`[data-auction-id="${auctionId}"]`);
    if (card) {
        const priceElement = card.querySelector('.price-value');
        if (priceElement) {
            priceElement.textContent = formatCurrency(amount);
        }
    }
}

/**
 * 显示页面
 * @param {string} pageName - 页面名称
 */
export function showPage(pageName) {
    pageManager.show(pageName);
}

/**
 * 注册页面显示回调
 * @param {string} pageName - 页面名称
 * @param {Function} callback - 回调函数
 */
export function onPageShow(pageName, callback) {
    pageManager.onPageShow(pageName, callback);
}

// 注册页面回调
onPageShow('home', () => {
    renderFeaturedAuctions();
});

onPageShow('catalog', () => {
    // 从筛选器获取筛选条件
    const categoryFilter = $('#categoryFilter')?.value || 'all';
    const priceFilter = $('#priceFilter')?.value || 'all';
    const statusFilter = $('#statusFilter')?.value || 'all';
    
    renderCatalog({
        category: categoryFilter,
        priceRange: priceFilter,
        status: statusFilter
    });
});

// 导出页面管理器（用于高级操作）
export default pageManager;

// 保持向后兼容（全局函数）
if (typeof window !== 'undefined') {
    window.showPage = showPage;
    window.renderFeaturedAuctions = renderFeaturedAuctions;
    window.renderCatalog = renderCatalog;
}

