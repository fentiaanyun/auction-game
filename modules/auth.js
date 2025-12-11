/**
 * 认证模块
 * 处理用户登录、注册、登出等功能
 */

import { userStorage } from './storage.js';
import { getState, setState } from './state.js';
import { USER_CONFIG, ADMIN_CONFIG } from './constants.js';
import { $ } from './utils.js';
import logger from './logger.js';

/**
 * 打开登录/注册模态框
 */
export function openAuthModal() {
    const modal = $('#authModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * 关闭登录/注册模态框
 */
export function closeAuthModal() {
    const modal = $('#authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 显示登录表单
 */
export function showLogin() {
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
}

/**
 * 显示注册表单
 */
export function showRegister() {
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
}

/**
 * 用户登录
 * @returns {boolean} 是否登录成功
 */
export function login() {
    const usernameInput = $('#loginUsername');
    const passwordInput = $('#loginPassword');
    
    if (!usernameInput || !passwordInput) {
        logger.error('登录表单元素不存在');
        return false;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        alert('请输入用户名和密码');
        return false;
    }

    const user = userStorage.getUser(username);
    if (user && user.password === password) {
        setState('currentUser', user);
        updateUserUI();
        closeAuthModal();
        checkDailyLogin();
        logger.info('用户登录成功:', username);
        return true;
    } else {
        alert('用户名或密码错误');
        logger.warn('登录失败:', username);
        return false;
    }
}

/**
 * 用户注册
 * @returns {boolean} 是否注册成功
 */
export function register() {
    const usernameInput = $('#registerUsername');
    const passwordInput = $('#registerPassword');
    const confirmPasswordInput = $('#confirmPassword');
    
    if (!usernameInput || !passwordInput || !confirmPasswordInput) {
        logger.error('注册表单元素不存在');
        return false;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!username || !password) {
        alert('请输入用户名和密码');
        return false;
    }

    if (password !== confirmPassword) {
        alert('两次密码输入不一致');
        return false;
    }

    if (userStorage.getUser(username)) {
        alert('用户名已存在');
        return false;
    }

    const newUser = {
        username,
        password, // 注意：实际项目中应该加密
        balance: USER_CONFIG.INITIAL_BALANCE,
        bidHistory: [],
        wonAuctions: [],
        registrations: [],
        achievements: [],
        level: USER_CONFIG.DEFAULT_LEVEL,
        lastLogin: new Date().toDateString(),
        totalBids: 0,
        isAnonymous: false
    };

    userStorage.saveUser(newUser, true);
    setState('currentUser', newUser);
    updateUserUI();
    closeAuthModal();
    
    // 触发成就通知（需要从ui模块导入）
    if (window.showAchievement) {
        window.showAchievement(`欢迎加入臻藏拍卖！您已获得 ${USER_CONFIG.INITIAL_BALANCE.toLocaleString()} 游戏币起始资金`);
    }
    
    logger.info('新用户注册:', username);
    return true;
}

/**
 * 用户登出
 */
export function logout() {
    setState('currentUser', null);
    const userInfo = $('#userInfo');
    const loginBtn = $('#loginBtn');
    const adminNavLink = $('#adminNavLink');
    
    if (userInfo) userInfo.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'block';
    if (adminNavLink) adminNavLink.style.display = 'none';
    
    // 跳转到首页（需要从ui模块导入showPage）
    if (window.showPage) {
        window.showPage('home');
    }
    
    logger.info('用户已登出');
}

/**
 * 更新用户UI显示
 */
export function updateUserUI() {
    const currentUser = getState('currentUser');
    const userInfo = $('#userInfo');
    const loginBtn = $('#loginBtn');
    const userName = $('#userName');
    const userBalance = $('#userBalance');
    const adminNavLink = $('#adminNavLink');

    if (currentUser) {
        if (userInfo) userInfo.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (userName) userName.textContent = currentUser.username;
        if (userBalance) userBalance.textContent = currentUser.balance.toLocaleString();

        // 显示管理员链接
        if (isAdmin() && adminNavLink) {
            adminNavLink.style.display = 'block';
        }
    }
}

/**
 * 检查是否为管理员
 * @returns {boolean} 是否为管理员
 */
export function isAdmin() {
    const currentUser = getState('currentUser');
    if (!currentUser) return false;
    return ADMIN_CONFIG.ADMIN_USERS.includes(currentUser.username);
}

/**
 * 检查每日登录奖励
 */
export function checkDailyLogin() {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    const today = new Date().toDateString();
    if (currentUser.lastLogin !== today) {
        currentUser.lastLogin = today;
        currentUser.balance += USER_CONFIG.DAILY_REWARD;
        userStorage.saveUser(currentUser, true);
        updateUserUI();
        
        if (window.showAchievement) {
            window.showAchievement(`每日登录奖励：+${USER_CONFIG.DAILY_REWARD} 游戏币！`);
        }
        
        logger.info('每日登录奖励已发放:', currentUser.username);
    }
}

/**
 * 获取显示名称（支持匿名）
 * @param {string} username - 用户名
 * @returns {string} 显示名称
 */
export function getDisplayName(username) {
    if (!username) return '未知用户';

    const user = userStorage.getUser(username);
    if (user && user.isAnonymous) {
        return '神秘玩家';
    }
    return username;
}

