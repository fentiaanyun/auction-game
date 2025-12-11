/**
 * 通知模块
 * 统一管理所有通知、提示和成就显示
 */

import { UI_CONFIG } from './constants.js';
import { $ } from './utils.js';
import logger from './logger.js';

/**
 * 通知类型
 */
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    ACHIEVEMENT: 'achievement'
};

/**
 * 通知管理器
 */
class NotificationManager {
    constructor() {
        this.notificationQueue = [];
        this.isShowing = false;
        this.init();
    }

    /**
     * 初始化通知系统
     */
    init() {
        // 确保通知容器存在
        let container = $('#achievementNotification');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievementNotification';
            container.className = 'achievement-notification';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, type = NOTIFICATION_TYPES.INFO, duration = UI_CONFIG.NOTIFICATION_DURATION) {
        const notification = {
            message,
            type,
            duration,
            timestamp: Date.now()
        };

        this.notificationQueue.push(notification);
        this.processQueue();
    }

    /**
     * 处理通知队列
     */
    processQueue() {
        if (this.isShowing || this.notificationQueue.length === 0) {
            return;
        }

        const notification = this.notificationQueue.shift();
        this.displayNotification(notification);
    }

    /**
     * 显示单个通知
     * @param {Object} notification - 通知对象
     */
    displayNotification(notification) {
        this.isShowing = true;

        // 根据类型选择图标和样式
        const icons = {
            [NOTIFICATION_TYPES.SUCCESS]: 'fa-check-circle',
            [NOTIFICATION_TYPES.ERROR]: 'fa-exclamation-circle',
            [NOTIFICATION_TYPES.WARNING]: 'fa-exclamation-triangle',
            [NOTIFICATION_TYPES.INFO]: 'fa-info-circle',
            [NOTIFICATION_TYPES.ACHIEVEMENT]: 'fa-trophy'
        };

        const icon = icons[notification.type] || icons[NOTIFICATION_TYPES.INFO];

        // 设置内容
        this.container.innerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;">
                <i class="fas ${icon}" style="font-size:1.5rem;"></i>
                <div>${notification.message}</div>
            </div>
        `;

        // 添加类型样式
        this.container.className = `achievement-notification notification-${notification.type}`;
        this.container.classList.add('show');

        // 记录日志
        logger.info('显示通知', {
            type: notification.type,
            message: notification.message
        });

        // 自动隐藏
        setTimeout(() => {
            this.hide();
        }, notification.duration);
    }

    /**
     * 隐藏当前通知
     */
    hide() {
        if (this.container) {
            this.container.classList.remove('show');
        }
        this.isShowing = false;

        // 处理下一个通知
        setTimeout(() => {
            this.processQueue();
        }, 300); // 等待动画完成
    }

    /**
     * 显示成功通知
     * @param {string} message - 消息
     */
    success(message) {
        this.show(message, NOTIFICATION_TYPES.SUCCESS);
    }

    /**
     * 显示错误通知
     * @param {string} message - 消息
     */
    error(message) {
        this.show(message, NOTIFICATION_TYPES.ERROR);
    }

    /**
     * 显示警告通知
     * @param {string} message - 消息
     */
    warning(message) {
        this.show(message, NOTIFICATION_TYPES.WARNING);
    }

    /**
     * 显示信息通知
     * @param {string} message - 消息
     */
    info(message) {
        this.show(message, NOTIFICATION_TYPES.INFO);
    }

    /**
     * 显示成就通知
     * @param {string} message - 消息
     */
    achievement(message) {
        this.show(message, NOTIFICATION_TYPES.ACHIEVEMENT, UI_CONFIG.NOTIFICATION_DURATION * 1.5);
    }
}

// 创建单例实例
const notificationManager = new NotificationManager();

// 导出便捷方法
export const showNotification = (message, type, duration) => 
    notificationManager.show(message, type, duration);
export const showSuccess = (message) => notificationManager.success(message);
export const showError = (message) => notificationManager.error(message);
export const showWarning = (message) => notificationManager.warning(message);
export const showInfo = (message) => notificationManager.info(message);
export const showAchievement = (message) => notificationManager.achievement(message);

// 保持向后兼容（全局函数）
if (typeof window !== 'undefined') {
    window.showAchievement = showAchievement;
}

export default notificationManager;

