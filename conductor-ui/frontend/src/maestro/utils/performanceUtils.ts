// Performance monitoring and optimization utilities
import React from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Custom metrics
  routeChangeTime: number;
  apiResponseTime: Record<string, number>;
  renderTime: Record<string, number>;

  // Resource metrics
  bundleSize: number;
  imageCount: number;
  scriptCount: number;
  styleCount: number;
}

export interface PerformanceBudgets {
  lcp: { target: number; warning: number };
  fid: { target: number; warning: number };
  cls: { target: number; warning: number };
  fcp: { target: number; warning: number };
  bundleSize: { target: number; warning: number };
  routeChange: { target: number; warning: number };
}

const DEFAULT_BUDGETS: PerformanceBudgets = {
  lcp: { target: 2500, warning: 4000 },
  fid: { target: 100, warning: 300 },
  cls: { target: 0.1, warning: 0.25 },
  fcp: { target: 1800, warning: 3000 },
  bundleSize: { target: 250000, warning: 500000 },
  routeChange: { target: 250, warning: 1000 },
};

export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private budgets: PerformanceBudgets;
  private observers: PerformanceObserver[] = [];
  private onViolation?: (metric: string, value: number, budget: number) => void;

  constructor(budgets: Partial<PerformanceBudgets> = {}) {
    this.budgets = { ...DEFAULT_BUDGETS, ...budgets };
    this.setupObservers();
  }

  private setupObservers(): void {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    this.observeWebVitals();

    // Navigation timing
    this.observeNavigationTiming();

    // Resource timing
    this.observeResourceTiming();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    this.createObserver('largest-contentful-paint', (entries) => {
      const lcp = entries[entries.length - 1];
      this.recordMetric('lcp', lcp.startTime);
      this.checkBudget('lcp', lcp.startTime);
    });

    // First Input Delay
    this.createObserver('first-input', (entries) => {
      const fid = entries[0];
      this.recordMetric('fid', fid.processingStart - fid.startTime);
      this.checkBudget('fid', fid.processingStart - fid.startTime);
    });

    // Cumulative Layout Shift
    this.createObserver('layout-shift', (entries) => {
      const cls = entries.reduce((sum, entry) => {
        if (!(entry as { hadRecentInput: boolean }).hadRecentInput) {
          sum += (entry as { value: number }).value;
        }
        return sum;
      }, 0);
      this.recordMetric('cls', cls);
      this.checkBudget('cls', cls);
    });
  }

  private observeNavigationTiming(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(
          (entry) => entry.name === 'first-contentful-paint',
        );
        if (fcp) {
          this.recordMetric('fcp', fcp.startTime);
          this.checkBudget('fcp', fcp.startTime);
        }

        // Time to First Byte
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.recordMetric('ttfb', ttfb);
      }
    });
  }

  private observeResourceTiming(): void {
    this.createObserver('resource', (entries) => {
      entries.forEach((entry) => {
        const resource = entry as PerformanceResourceTiming;
        if (resource.name.includes('/api/')) {
          const apiPath = new URL(resource.name).pathname;
          this.recordApiResponse(
            apiPath,
            resource.responseEnd - resource.responseStart,
          );
        }
      });
    });
  }

  private createObserver(
    type: string,
    callback: (entries: PerformanceEntry[]) => void,
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to create ${type} observer:`, error);
    }
  }

  private recordMetric(key: keyof PerformanceMetrics, value: number): void {
    this.metrics[key] = value as never;
  }

  private recordApiResponse(path: string, duration: number): void {
    if (!this.metrics.apiResponseTime) {
      this.metrics.apiResponseTime = {};
    }
    this.metrics.apiResponseTime[path] = duration;
  }

  private checkBudget(metric: keyof PerformanceBudgets, value: number): void {
    const budget = this.budgets[metric];
    if (budget && value > budget.warning) {
      console.warn(
        `Performance budget violation: ${metric} ${value.toFixed(2)}ms > ${budget.warning}ms`,
      );
      this.onViolation?.(metric, value, budget.warning);
    }
  }

  measureRouteChange<T>(routeName: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      if (!this.metrics.renderTime) {
        this.metrics.renderTime = {};
      }
      this.metrics.renderTime[routeName] = duration;
      this.recordMetric('routeChangeTime', duration);
      this.checkBudget('routeChange', duration);
    });
  }

  onBudgetViolation(
    callback: (metric: string, value: number, budget: number) => void,
  ): void {
    this.onViolation = callback;
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  getBudgetStatus(): {
    metric: string;
    value: number;
    budget: number;
    status: 'good' | 'warning' | 'poor';
  }[] {
    const results: {
      metric: string;
      value: number;
      budget: number;
      status: 'good' | 'warning' | 'poor';
    }[] = [];

    Object.entries(this.budgets).forEach(([metric, budget]) => {
      const value = this.metrics[metric as keyof PerformanceMetrics] as number;
      if (value !== undefined) {
        let status: 'good' | 'warning' | 'poor' = 'good';
        if (value > budget.warning) status = 'poor';
        else if (value > budget.target) status = 'warning';

        results.push({ metric, value, budget: budget.target, status });
      }
    });

    return results;
  }

  generateReport(): string {
    const status = this.getBudgetStatus();
    const violations = status.filter((s) => s.status !== 'good');

    let report = '# Performance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    if (violations.length === 0) {
      report += '✅ All performance budgets are within target ranges.\n\n';
    } else {
      report += `⚠️ ${violations.length} performance budget violations detected:\n\n`;
      violations.forEach((v) => {
        report += `- **${v.metric}**: ${v.value.toFixed(2)}ms (budget: ${v.budget}ms) - ${v.status}\n`;
      });
      report += '\n';
    }

    report += '## All Metrics\n\n';
    status.forEach((s) => {
      const icon =
        s.status === 'good' ? '✅' : s.status === 'warning' ? '⚠️' : '❌';
      report += `${icon} **${s.metric}**: ${s.value.toFixed(2)}ms (budget: ${s.budget}ms)\n`;
    });

    return report;
  }

  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = (
  budgets?: Partial<PerformanceBudgets>,
) => {
  const [monitor] = React.useState(() => new PerformanceMonitor(budgets));
  const [metrics, setMetrics] = React.useState<Partial<PerformanceMetrics>>({});
  const [violations, setViolations] = React.useState<
    { metric: string; value: number; budget: number }[]
  >([]);

  React.useEffect(() => {
    monitor.onBudgetViolation((metric, value, budget) => {
      setViolations((prev) => [...prev.slice(-4), { metric, value, budget }]); // Keep last 5 violations
    });

    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 1000);

    return () => {
      clearInterval(interval);
      monitor.destroy();
    };
  }, [monitor]);

  return {
    metrics,
    violations,
    budgetStatus: monitor.getBudgetStatus(),
    measureRouteChange: monitor.measureRouteChange.bind(monitor),
    generateReport: monitor.generateReport.bind(monitor),
  };
};

function getDisplayName(WrappedComponent: React.ComponentType<object>): string {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<object>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType,
) => {
  const LazyComponent = React.lazy(importFn);

  const WrappedComponent = (props: React.ComponentProps<T>) =>
    React.createElement(
      React.Suspense,
      {
        fallback: fallback
          ? React.createElement(fallback)
          : React.createElement('div', null, 'Loading...'),
      },
      React.createElement(LazyComponent, props),
    );
  WrappedComponent.displayName = `Lazy(${getDisplayName(LazyComponent as React.ComponentType<object>)})`;
  return WrappedComponent;
};

// Bundle splitting utility
export const preloadRoute = (routePath: string): void => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);
  }
};

// Image optimization helpers
export const createOptimizedImageSrc = (
  src: string,
  width: number,
  quality = 75,
): string => {
  // In production, this would integrate with an image optimization service
  return `${src}?w=${width}&q=${quality}`;
};

export const useImagePreload = (src: string): boolean => {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = src;
  }, [src]);

  return loaded;
};
