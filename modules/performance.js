/**
 * 性能优化模块
 * 提供性能优化相关的工具和功能
 */

import { debounce, throttle } from './utils.js';
import logger from './logger.js';

/**
 * 性能监控器
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderCount: 0,
            renderTime: [],
            domUpdates: 0,
            storageWrites: 0,
            storageReads: 0
        };
        this.enabled = false;
    }

    /**
     * 启用性能监控
     */
    enable() {
        this.enabled = true;
        logger.info('性能监控已启用');
    }

    /**
     * 禁用性能监控
     */
    disable() {
        this.enabled = false;
    }

    /**
     * 记录渲染时间
     * @param {string} component - 组件名称
     * @param {number} time - 渲染时间（毫秒）
     */
    recordRender(component, time) {
        if (!this.enabled) return;

        this.metrics.renderCount++;
        this.metrics.renderTime.push({ component, time });
        
        // 只保留最近100条记录
        if (this.metrics.renderTime.length > 100) {
            this.metrics.renderTime.shift();
        }

        if (time > 100) {
            logger.warn(`渲染性能警告: ${component} 耗时 ${time}ms`);
        }
    }

    /**
     * 记录DOM更新
     */
    recordDOMUpdate() {
        if (!this.enabled) return;
        this.metrics.domUpdates++;
    }

    /**
     * 记录存储写入
     */
    recordStorageWrite() {
        if (!this.enabled) return;
        this.metrics.storageWrites++;
    }

    /**
     * 记录存储读取
     */
    recordStorageRead() {
        if (!this.enabled) return;
        this.metrics.storageReads++;
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能指标
     */
    getReport() {
        const avgRenderTime = this.metrics.renderTime.length > 0
            ? this.metrics.renderTime.reduce((sum, r) => sum + r.time, 0) / this.metrics.renderTime.length
            : 0;

        return {
            ...this.metrics,
            avgRenderTime: Math.round(avgRenderTime * 100) / 100,
            maxRenderTime: this.metrics.renderTime.length > 0
                ? Math.max(...this.metrics.renderTime.map(r => r.time))
                : 0
        };
    }

    /**
     * 重置性能指标
     */
    reset() {
        this.metrics = {
            renderCount: 0,
            renderTime: [],
            domUpdates: 0,
            storageWrites: 0,
            storageReads: 0
        };
    }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

/**
 * 性能优化的渲染函数包装器
 * @param {Function} renderFn - 渲染函数
 * @param {string} componentName - 组件名称
 * @param {number} debounceMs - 防抖延迟（毫秒）
 * @returns {Function} 优化后的渲染函数
 */
export function optimizedRender(renderFn, componentName, debounceMs = 100) {
    const debouncedRender = debounce(() => {
        const startTime = performance.now();
        renderFn();
        const endTime = performance.now();
        performanceMonitor.recordRender(componentName, endTime - startTime);
    }, debounceMs);

    return debouncedRender;
}

/**
 * 批量DOM更新
 * @param {Function} updateFn - 更新函数
 */
export function batchDOMUpdate(updateFn) {
    // 使用requestAnimationFrame优化DOM更新
    requestAnimationFrame(() => {
        updateFn();
        performanceMonitor.recordDOMUpdate();
    });
}

/**
 * 图片懒加载管理器
 */
class LazyLoadManager {
    constructor() {
        this.observer = null;
        this.init();
    }

    /**
     * 初始化IntersectionObserver
     */
    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            img.classList.add('loaded');
                            this.observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px' // 提前50px开始加载
            });
        }
    }

    /**
     * 添加图片到懒加载
     * @param {HTMLImageElement} img - 图片元素
     * @param {string} src - 图片URL
     */
    add(img, src) {
        if (!this.observer) {
            // 不支持IntersectionObserver，直接加载
            img.src = src;
            return;
        }

        // 设置占位符
        img.setAttribute('data-src', src);
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';
        img.classList.add('lazy-load');

        // 开始观察
        this.observer.observe(img);
    }

    /**
     * 移除图片观察
     * @param {HTMLImageElement} img - 图片元素
     */
    remove(img) {
        if (this.observer) {
            this.observer.unobserve(img);
        }
    }

    /**
     * 销毁观察器
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// 创建单例实例
const lazyLoadManager = new LazyLoadManager();

/**
 * 添加图片懒加载
 * @param {HTMLImageElement} img - 图片元素
 * @param {string} src - 图片URL
 */
export function addLazyLoad(img, src) {
    lazyLoadManager.add(img, src);
}

/**
 * 移除图片懒加载
 * @param {HTMLImageElement} img - 图片元素
 */
export function removeLazyLoad(img) {
    lazyLoadManager.remove(img);
}

/**
 * 虚拟滚动（用于长列表优化）
 */
class VirtualScroll {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.items = [];
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.init();
    }

    init() {
        this.container.addEventListener('scroll', throttle(() => {
            this.update();
        }, 16)); // 约60fps
    }

    setItems(items) {
        this.items = items;
        this.update();
    }

    update() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        this.visibleStart = Math.floor(scrollTop / this.itemHeight);
        this.visibleEnd = Math.min(
            this.visibleStart + Math.ceil(containerHeight / this.itemHeight) + 1,
            this.items.length
        );

        this.render();
    }

    render() {
        const visibleItems = this.items.slice(this.visibleStart, this.visibleEnd);
        // 渲染可见项
        // 这里需要根据实际需求实现
    }
}

/**
 * 内存优化：清理不必要的数据
 */
export function cleanupMemory() {
    // 清理过期的历史记录（保留最近100条）
    // 清理过期的用户数据
    // 触发垃圾回收提示
    if (window.gc) {
        window.gc();
    }
}

/**
 * 获取性能报告
 * @returns {Object} 性能报告
 */
export function getPerformanceReport() {
    return performanceMonitor.getReport();
}

/**
 * 启用性能监控
 */
export function enablePerformanceMonitoring() {
    performanceMonitor.enable();
}

/**
 * 禁用性能监控
 */
export function disablePerformanceMonitoring() {
    performanceMonitor.disable();
}

// 导出性能监控器实例（供测试页面使用）
export { performanceMonitor };

export default {
    performanceMonitor,
    optimizedRender,
    batchDOMUpdate,
    addLazyLoad,
    removeLazyLoad,
    getPerformanceReport,
    enablePerformanceMonitoring,
    disablePerformanceMonitoring,
    cleanupMemory
};

