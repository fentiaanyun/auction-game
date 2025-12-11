/**
 * 应用常量配置
 * 集中管理所有配置值和魔法数字
 */

// ==================== 拍卖配置 ====================
export const AUCTION_CONFIG = {
    DEFAULT_DURATION: 180,        // 默认拍卖时长：3分钟（秒）
    EXTEND_TIME: 15,              // 延时时间：15秒
    MIN_INCREMENT: 100,            // 最低加价：100游戏币
    AI_BID_CHECK_INTERVAL: 20000, // AI竞价检查间隔：20秒
    AI_BID_DELAY_MIN: 5000,       // AI竞价最小延迟：5秒
    AI_BID_DELAY_MAX: 20000,      // AI竞价最大延迟：20秒
    AI_BID_PROBABILITY: 0.5,      // AI竞价概率：50%
    AI_BID_INCREMENT_MIN: 100,    // AI加价最小值
    AI_BID_INCREMENT_MAX: 500,    // AI加价最大值
    AI_MAX_PRICE_MULTIPLIER: 1.2, // AI最高出价为保留价的120%
    BID_HISTORY_DISPLAY_COUNT: 5  // 显示最近出价记录数
};

// ==================== 用户配置 ====================
export const USER_CONFIG = {
    INITIAL_BALANCE: 10000,       // 初始游戏币：10,000
    DAILY_REWARD: 500,            // 每日登录奖励：500游戏币
    DEFAULT_LEVEL: '新手藏家',     // 默认用户等级
    COLLECTOR_THRESHOLD: 5,       // 资深藏家需要赢得5场拍卖
    BIG_SPENDER_THRESHOLD: 5000   // 豪爽藏家需要单次出价5000+
};

// ==================== 成就配置 ====================
export const ACHIEVEMENTS = [
    { id: 'first_bid', name: '初次竞拍', description: '完成第一次出价', unlocked: false },
    { id: 'first_win', name: '首场胜利', description: '赢得第一场拍卖', unlocked: false },
    { id: 'big_spender', name: '豪爽藏家', description: '单次出价超过5000', unlocked: false },
    { id: 'collector', name: '资深藏家', description: '赢得5场拍卖', unlocked: false },
    { id: 'speed_bidder', name: '闪电竞拍', description: '在最后10秒内赢得拍卖', unlocked: false }
];

// ==================== 管理员配置 ====================
export const ADMIN_CONFIG = {
    ADMIN_USERS: ['admin'],       // 管理员用户名列表
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 图片最大大小：5MB
    MIN_AUCTION_DURATION: 1,      // 最小拍卖时长：1分钟
    MAX_AUCTION_DURATION: 60      // 最大拍卖时长：60分钟
};

// ==================== 存储键名 ====================
export const STORAGE_KEYS = {
    AUCTIONS: 'auctions',
    AUCTION_HISTORY: 'auctionHistory',
    USERS: 'users',
    LAST_USER: 'lastUser',
    SITE_SETTINGS: 'siteSettings'
};

// ==================== 拍卖状态 ====================
export const AUCTION_STATUS = {
    PENDING: 'pending',           // 等待开始
    ACTIVE: 'active',             // 进行中
    ENDED: 'ended'                // 已结束
};

// ==================== 实时拍卖阶段 ====================
export const LIVE_PHASE = {
    WAITING: 'waiting',           // 等待开始
    BIDDING: 'bidding',           // 竞拍中
    ENDED: 'ended'                // 已结束
};

// ==================== 类别映射 ====================
export const CATEGORY_NAMES = {
    painting: '油画',
    sculpture: '雕塑',
    photography: '摄影',
    antique: '古董'
};

// ==================== 默认拍卖品数据 ====================
export const DEFAULT_AUCTIONS = [
    {
        id: 1,
        title: '星夜',
        artist: '文森特·梵高, 1889',
        category: 'painting',
        image: 'https://images.unsplash.com/photo-1578926314433-e2789279f4aa?w=800&q=80',
        description: '梵高最著名的作品之一，描绘了法国圣雷米一个小镇夜晚的天空景象，充满动感的笔触和鲜艳的色彩展现了艺术家内心的激情。',
        startPrice: 2000,
        currentBid: 2000,
        reservePrice: 3000,
        timeLeft: AUCTION_CONFIG.DEFAULT_DURATION,
        extendedTime: 0,
        lastBidTime: null,
        status: AUCTION_STATUS.ACTIVE,
        bidHistory: [],
        highestBidder: null,
        registeredUsers: [],
        likes: [],
        likesCount: 0
    },
    {
        id: 2,
        title: '思考者',
        artist: '奥古斯特·罗丹, 1902',
        category: 'sculpture',
        image: 'https://images.unsplash.com/photo-1567443024551-f3e3cc2be870?w=800&q=80',
        description: '罗丹最负盛名的雕塑作品，展现了一个沉思的人物形象，象征着哲学与诗意的深度思考。',
        startPrice: 3500,
        currentBid: 3500,
        reservePrice: 5000,
        timeLeft: AUCTION_CONFIG.DEFAULT_DURATION,
        extendedTime: 0,
        lastBidTime: null,
        status: AUCTION_STATUS.ACTIVE,
        bidHistory: [],
        highestBidder: null,
        registeredUsers: [],
        likes: [],
        likesCount: 0
    }
];

// ==================== UI配置 ====================
export const UI_CONFIG = {
    NOTIFICATION_DURATION: 4000,  // 通知显示时长：4秒
    FIREWORKS_DURATION: 300,       // 烟花动画帧数：5秒（300帧）
    MODAL_ANIMATION_DURATION: 300, // 模态框动画时长：300ms
    DEBOUNCE_DELAY: 500           // 防抖延迟：500ms
};

// ==================== 主题预设 ====================
export const THEME_PRESETS = {
    default: {
        name: '默认渐变',
        bgType: 'gradient',
        gradientStart: '#0f0f1e',
        gradientMid: '#1a1a2e',
        gradientEnd: '#16213e',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        accentColor: '#ffd89b'
    },
    ocean: {
        name: '海洋蓝',
        bgType: 'gradient',
        gradientStart: '#0f2027',
        gradientMid: '#203a43',
        gradientEnd: '#2c5364',
        primaryColor: '#2e3192',
        secondaryColor: '#1bffff',
        accentColor: '#4facfe'
    },
    sunset: {
        name: '日落橙',
        bgType: 'gradient',
        gradientStart: '#2c1a1e',
        gradientMid: '#3d2429',
        gradientEnd: '#4e2e34',
        primaryColor: '#ff6b6b',
        secondaryColor: '#feca57',
        accentColor: '#ee5a6f'
    },
    forest: {
        name: '森林绿',
        bgType: 'gradient',
        gradientStart: '#0a1f1c',
        gradientMid: '#152c27',
        gradientEnd: '#1f3932',
        primaryColor: '#11998e',
        secondaryColor: '#38ef7d',
        accentColor: '#7bed9f'
    },
    royal: {
        name: '皇家紫',
        bgType: 'gradient',
        gradientStart: '#1a0f2e',
        gradientMid: '#2a1a47',
        gradientEnd: '#3a2560',
        primaryColor: '#8e2de2',
        secondaryColor: '#4a00e0',
        accentColor: '#c471ed'
    },
    dark: {
        name: '暗夜黑',
        bgType: 'gradient',
        gradientStart: '#0a0a0a',
        gradientMid: '#1a1a1a',
        gradientEnd: '#2a2a2a',
        primaryColor: '#555555',
        secondaryColor: '#888888',
        accentColor: '#aaaaaa'
    }
};

