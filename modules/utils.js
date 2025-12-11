/**
 * 工具函数模块
 * 提供通用的工具函数
 */

import { CATEGORY_NAMES } from './constants.js';

/**
 * 格式化时间显示（分:秒）
 * @param {number} seconds - 总秒数
 * @returns {string} 格式化后的时间字符串 "M:SS"
 */
export function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * 获取类别中文名称
 * @param {string} category - 类别代码
 * @returns {string} 类别中文名称
 */
export function getCategoryName(category) {
    return CATEGORY_NAMES[category] || category;
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 将Date对象转换为datetime-local格式
 * @param {Date} date - Date对象
 * @returns {string} datetime-local格式字符串
 */
export function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析后的对象或默认值
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON解析失败:', error);
        return defaultValue;
    }
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 生成唯一ID（基于时间戳）
 * @returns {number} 唯一ID
 */
export function generateId() {
    return Date.now();
}

/**
 * 验证邮箱格式（简单验证）
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国手机号）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
export function isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
}

/**
 * 格式化金额显示
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额字符串
 */
export function formatCurrency(amount) {
    return `¥${amount.toLocaleString()}`;
}

/**
 * 检查是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('复制失败:', error);
            return fallbackCopyToClipboard(text);
        }
    } else {
        return fallbackCopyToClipboard(text);
    }
}

/**
 * 降级复制方案（兼容老浏览器）
 * @param {string} text - 要复制的文本
 * @returns {boolean} 是否复制成功
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    } catch (err) {
        document.body.removeChild(textArea);
        console.error('复制失败:', err);
        return false;
    }
}

/**
 * 安全的DOM查询
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} parent - 父元素（可选）
 * @returns {HTMLElement|null} 找到的元素或null
 */
export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * 安全的DOM查询（多个元素）
 * @param {string} selector - CSS选择器
 * @param {HTMLElement} parent - 父元素（可选）
 * @returns {NodeList} 找到的元素列表
 */
export function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

