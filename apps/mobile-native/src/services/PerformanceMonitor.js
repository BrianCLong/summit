"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackNavigation = exports.trackStorageOperation = exports.trackNetworkRequest = exports.trackRender = exports.measure = exports.mark = exports.performanceMonitor = void 0;
const react_native_1 = require("react-native");
const Sentry = __importStar(require("@sentry/react-native"));
const analytics_1 = __importDefault(require("@react-native-firebase/analytics"));
const react_native_performance_1 = require("react-native-performance");
class PerformanceMonitor {
    marks = new Map();
    metrics = [];
    isEnabled = __DEV__;
    constructor() {
        this.setupNativePerformanceObserver();
    }
    /**
     * Setup native performance observer for automatic tracking
     */
    setupNativePerformanceObserver() {
        if (!this.isEnabled)
            return;
        // Track app startup metrics
        this.trackAppStartup();
        // Track memory usage periodically
        this.setupMemoryMonitoring();
        // Track JavaScript thread performance
        this.setupJSThreadMonitoring();
    }
    /**
     * Track app startup performance
     */
    trackAppStartup() {
        const startupMetrics = react_native_performance_1.performance.getEntriesByType('navigation');
        if (startupMetrics.length > 0) {
            const startup = startupMetrics[0];
            this.recordMetric({
                name: 'app_startup_time',
                value: startup.duration,
                unit: 'ms',
                category: 'startup',
                metadata: {
                    platform: react_native_1.Platform.OS,
                    version: react_native_1.Platform.Version,
                },
            });
            // Send to analytics
            (0, analytics_1.default)().logEvent('app_startup', {
                duration: startup.duration,
                platform: react_native_1.Platform.OS,
            });
        }
    }
    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if (react_native_1.Platform.OS === 'android') {
            setInterval(() => {
                // @ts-ignore
                const memoryInfo = react_native_performance_1.performance.memory;
                if (memoryInfo) {
                    this.recordMetric({
                        name: 'memory_usage',
                        value: memoryInfo.usedJSHeapSize,
                        unit: 'bytes',
                        category: 'custom',
                        metadata: {
                            total: memoryInfo.totalJSHeapSize,
                            limit: memoryInfo.jsHeapSizeLimit,
                        },
                    });
                }
            }, 30000); // Check every 30 seconds
        }
    }
    /**
     * Setup JavaScript thread monitoring
     */
    setupJSThreadMonitoring() {
        let lastTimestamp = Date.now();
        setInterval(() => {
            const now = Date.now();
            const delta = now - lastTimestamp;
            const expected = 1000; // 1 second
            const drift = delta - expected;
            if (drift > 100) { // More than 100ms drift indicates JS thread blocking
                this.recordMetric({
                    name: 'js_thread_blocked',
                    value: drift,
                    unit: 'ms',
                    category: 'custom',
                    metadata: {
                        expected,
                        actual: delta,
                    },
                });
                console.warn(`[Performance] JS thread blocked for ${drift}ms`);
            }
            lastTimestamp = now;
        }, 1000);
    }
    /**
     * Mark the start of a performance measurement
     */
    mark(name) {
        if (!this.isEnabled)
            return;
        this.marks.set(name, {
            name,
            startTime: Date.now(),
        });
        console.log(`[Performance] Mark: ${name}`);
    }
    /**
     * Measure the time between a mark and now
     */
    measure(name, category = 'custom', metadata) {
        if (!this.isEnabled)
            return 0;
        const mark = this.marks.get(name);
        if (!mark) {
            console.warn(`[Performance] No mark found for: ${name}`);
            return 0;
        }
        const duration = Date.now() - mark.startTime;
        this.recordMetric({
            name,
            value: duration,
            unit: 'ms',
            category,
            metadata,
        });
        this.marks.delete(name);
        console.log(`[Performance] Measure: ${name} = ${duration}ms`);
        return duration;
    }
    /**
     * Record a custom metric
     */
    recordMetric(metric) {
        if (!this.isEnabled)
            return;
        this.metrics.push({
            ...metric,
            metadata: {
                ...metric.metadata,
                timestamp: Date.now(),
            },
        });
        // Send to Sentry as breadcrumb
        Sentry.addBreadcrumb({
            category: 'performance',
            message: `${metric.name}: ${metric.value}${metric.unit}`,
            level: 'info',
            data: metric.metadata,
        });
        // Send to Firebase Analytics
        (0, analytics_1.default)().logEvent('performance_metric', {
            metric_name: metric.name,
            metric_value: metric.value,
            metric_unit: metric.unit,
            metric_category: metric.category,
        });
        // Log slow operations
        if (metric.unit === 'ms' && metric.value > 1000) {
            console.warn(`[Performance] Slow operation detected: ${metric.name} took ${metric.value}ms`);
            Sentry.captureMessage(`Slow operation: ${metric.name}`, {
                level: 'warning',
                extra: metric,
            });
        }
    }
    /**
     * Track component render time
     */
    trackRender(componentName, renderTime, props) {
        this.recordMetric({
            name: `render_${componentName}`,
            value: renderTime,
            unit: 'ms',
            category: 'render',
            metadata: {
                component: componentName,
                propsSize: JSON.stringify(props || {}).length,
            },
        });
    }
    /**
     * Track network request
     */
    trackNetworkRequest(url, duration, size, success) {
        this.recordMetric({
            name: 'network_request',
            value: duration,
            unit: 'ms',
            category: 'network',
            metadata: {
                url,
                size,
                success,
                bandwidth: size / (duration / 1000), // bytes per second
            },
        });
    }
    /**
     * Track storage operation
     */
    trackStorageOperation(operation, duration, dataSize) {
        this.recordMetric({
            name: `storage_${operation}`,
            value: duration,
            unit: 'ms',
            category: 'storage',
            metadata: {
                operation,
                dataSize,
            },
        });
    }
    /**
     * Track navigation
     */
    trackNavigation(from, to, duration) {
        this.recordMetric({
            name: 'navigation',
            value: duration,
            unit: 'ms',
            category: 'custom',
            metadata: {
                from,
                to,
            },
        });
        (0, analytics_1.default)().logScreenView({
            screen_name: to,
            screen_class: to,
        });
    }
    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return [...this.metrics];
    }
    /**
     * Get metrics by category
     */
    getMetricsByCategory(category) {
        return this.metrics.filter(m => m.category === category);
    }
    /**
     * Get average metric value
     */
    getAverageMetric(name) {
        const metrics = this.metrics.filter(m => m.name === name);
        if (metrics.length === 0)
            return 0;
        const sum = metrics.reduce((acc, m) => acc + m.value, 0);
        return sum / metrics.length;
    }
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
        this.marks.clear();
        console.log('[Performance] Metrics cleared');
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            totalMetrics: this.metrics.length,
            categories: {
                startup: this.getMetricsByCategory('startup').length,
                render: this.getMetricsByCategory('render').length,
                network: this.getMetricsByCategory('network').length,
                storage: this.getMetricsByCategory('storage').length,
                custom: this.getMetricsByCategory('custom').length,
            },
            slowOperations: this.metrics.filter(m => m.unit === 'ms' && m.value > 1000),
            averages: {
                startup: this.getAverageMetric('app_startup_time'),
                navigation: this.getAverageMetric('navigation'),
                networkRequest: this.getAverageMetric('network_request'),
            },
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[Performance] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
    }
}
// Export singleton instance
exports.performanceMonitor = new PerformanceMonitor();
// Export convenience functions
const mark = (name) => exports.performanceMonitor.mark(name);
exports.mark = mark;
const measure = (name, category, metadata) => exports.performanceMonitor.measure(name, category, metadata);
exports.measure = measure;
const trackRender = (componentName, renderTime, props) => exports.performanceMonitor.trackRender(componentName, renderTime, props);
exports.trackRender = trackRender;
const trackNetworkRequest = (url, duration, size, success) => exports.performanceMonitor.trackNetworkRequest(url, duration, size, success);
exports.trackNetworkRequest = trackNetworkRequest;
const trackStorageOperation = (operation, duration, dataSize) => exports.performanceMonitor.trackStorageOperation(operation, duration, dataSize);
exports.trackStorageOperation = trackStorageOperation;
const trackNavigation = (from, to, duration) => exports.performanceMonitor.trackNavigation(from, to, duration);
exports.trackNavigation = trackNavigation;
