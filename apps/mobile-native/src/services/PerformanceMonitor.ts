import {Platform} from 'react-native';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import {performance} from 'react-native-performance';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  category: 'startup' | 'render' | 'network' | 'storage' | 'custom';
  metadata?: Record<string, any>;
}

interface PerformanceMark {
  name: string;
  startTime: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = __DEV__;

  constructor() {
    this.setupNativePerformanceObserver();
  }

  /**
   * Setup native performance observer for automatic tracking
   */
  private setupNativePerformanceObserver() {
    if (!this.isEnabled) return;

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
  private trackAppStartup() {
    const startupMetrics = performance.getEntriesByType('navigation');

    if (startupMetrics.length > 0) {
      const startup = startupMetrics[0];

      this.recordMetric({
        name: 'app_startup_time',
        value: startup.duration,
        unit: 'ms',
        category: 'startup',
        metadata: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      });

      // Send to analytics
      analytics().logEvent('app_startup', {
        duration: startup.duration,
        platform: Platform.OS,
      });
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring() {
    if (Platform.OS === 'android') {
      setInterval(() => {
        // @ts-ignore
        const memoryInfo = performance.memory;

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
  private setupJSThreadMonitoring() {
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
  mark(name: string): void {
    if (!this.isEnabled) return;

    this.marks.set(name, {
      name,
      startTime: Date.now(),
    });

    console.log(`[Performance] Mark: ${name}`);
  }

  /**
   * Measure the time between a mark and now
   */
  measure(name: string, category: PerformanceMetric['category'] = 'custom', metadata?: Record<string, any>): number {
    if (!this.isEnabled) return 0;

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
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

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
    analytics().logEvent('performance_metric', {
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
  trackRender(componentName: string, renderTime: number, props?: any): void {
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
  trackNetworkRequest(url: string, duration: number, size: number, success: boolean): void {
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
  trackStorageOperation(operation: string, duration: number, dataSize?: number): void {
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
  trackNavigation(from: string, to: string, duration: number): void {
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

    analytics().logScreenView({
      screen_name: to,
      screen_class: to,
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
    console.log('[Performance] Metrics cleared');
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
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
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[Performance] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const mark = (name: string) => performanceMonitor.mark(name);
export const measure = (name: string, category?: PerformanceMetric['category'], metadata?: Record<string, any>) =>
  performanceMonitor.measure(name, category, metadata);
export const trackRender = (componentName: string, renderTime: number, props?: any) =>
  performanceMonitor.trackRender(componentName, renderTime, props);
export const trackNetworkRequest = (url: string, duration: number, size: number, success: boolean) =>
  performanceMonitor.trackNetworkRequest(url, duration, size, success);
export const trackStorageOperation = (operation: string, duration: number, dataSize?: number) =>
  performanceMonitor.trackStorageOperation(operation, duration, dataSize);
export const trackNavigation = (from: string, to: string, duration: number) =>
  performanceMonitor.trackNavigation(from, to, duration);
