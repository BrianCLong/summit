import React, { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  errorCount: number;
  timestamp: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  sampleInterval?: number;
  maxSamples?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = true,
  sampleInterval = 5000, // 5 seconds
  maxSamples = 60, // Keep 5 minutes of data
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const collectMetrics = useCallback((): PerformanceMetrics => {
    const now = performance.now();

    // Memory usage (if available)
    const memory = (performance as any).memory;
    const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0; // MB

    // Network requests (approximate)
    const canReadEntries =
      typeof performance !== 'undefined' &&
      typeof performance.getEntriesByType === 'function';
    const entries = canReadEntries
      ? (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      : [];
    const recentRequests = entries.filter(
      (entry) => now - entry.startTime < sampleInterval,
    ).length;

    // Error count from console (simplified tracking)
    const errorCount = (window as any).__performanceErrors || 0;

    // Render time (using performance marks if available)
    const measureEntries = canReadEntries
      ? performance.getEntriesByType('measure')
      : [];
    const renderTime = measureEntries.reduce(
      (acc, measure) => acc + (measure as PerformanceEntry).duration,
      0,
    );

    return {
      renderTime,
      memoryUsage,
      networkRequests: recentRequests,
      errorCount,
      timestamp: now,
    };
  }, [sampleInterval]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const newMetrics = collectMetrics();

      setMetrics((prev) => {
        const updated = [...prev, newMetrics];
        // Keep only recent samples
        if (updated.length > maxSamples) {
          return updated.slice(-maxSamples);
        }
        return updated;
      });

      onMetricsUpdate?.(newMetrics);
    }, sampleInterval);

    // Initial collection
    const initialMetrics = collectMetrics();
    setMetrics([initialMetrics]);
    onMetricsUpdate?.(initialMetrics);

    return () => clearInterval(interval);
  }, [enabled, sampleInterval, maxSamples, collectMetrics, onMetricsUpdate]);

  const currentMetrics = metrics[metrics.length - 1];
  const averageMetrics =
    metrics.length > 0
      ? {
          renderTime:
            metrics.reduce((acc, m) => acc + m.renderTime, 0) / metrics.length,
          memoryUsage:
            metrics.reduce((acc, m) => acc + m.memoryUsage, 0) / metrics.length,
          networkRequests:
            metrics.reduce((acc, m) => acc + m.networkRequests, 0) /
            metrics.length,
          errorCount: metrics[metrics.length - 1]?.errorCount || 0,
        }
      : null;

  if (!enabled || !currentMetrics) return null;

  return (
    <>
      {/* Performance Indicator */}
      <div
        className={`
          fixed top-4 left-4 z-50 transition-all duration-200
          ${isVisible ? 'opacity-100' : 'opacity-30 hover:opacity-100'}
        `}
      >
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-mono"
          title="Performance Monitor"
        >
          <span
            className={`inline-block w-2 h-2 rounded-full mr-2 ${
              currentMetrics.memoryUsage > 150
                ? 'bg-red-400'
                : currentMetrics.memoryUsage > 100
                  ? 'bg-yellow-400'
                  : 'bg-green-400'
            }`}
          ></span>
          {Math.round(currentMetrics.memoryUsage)}MB
        </button>
      </div>

      {/* Detailed Performance Panel */}
      {isVisible && (
        <div className="fixed top-16 left-4 z-50 bg-white border rounded-lg shadow-lg p-4 w-80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-600">Memory Usage</div>
                <div className="font-mono">
                  {Math.round(currentMetrics.memoryUsage)}MB
                  {averageMetrics && (
                    <span className="text-gray-400 text-xs ml-1">
                      (avg: {Math.round(averageMetrics.memoryUsage)}MB)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-gray-600">Render Time</div>
                <div className="font-mono">
                  {currentMetrics.renderTime.toFixed(1)}ms
                  {averageMetrics && (
                    <span className="text-gray-400 text-xs ml-1">
                      (avg: {averageMetrics.renderTime.toFixed(1)}ms)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-gray-600">Network Requests</div>
                <div className="font-mono">
                  {currentMetrics.networkRequests}
                </div>
              </div>

              <div>
                <div className="text-gray-600">Errors</div>
                <div className="font-mono text-red-600">
                  {currentMetrics.errorCount}
                </div>
              </div>
            </div>

            {/* Mini chart */}
            {metrics.length > 1 && (
              <div className="mt-4">
                <div className="text-gray-600 text-xs mb-2">
                  Memory Usage Trend
                </div>
                <div className="h-16 bg-gray-50 rounded relative overflow-hidden">
                  <svg width="100%" height="100%" className="absolute">
                    {metrics.slice(-20).map((metric, i, arr) => {
                      if (i === 0) return null;
                      const prevMetric = arr[i - 1];
                      const x1 = ((i - 1) / (arr.length - 1)) * 100;
                      const x2 = (i / (arr.length - 1)) * 100;
                      const y1 = 100 - (prevMetric.memoryUsage / 200) * 100;
                      const y2 = 100 - (metric.memoryUsage / 200) * 100;

                      return (
                        <line
                          key={i}
                          x1={`${x1}%`}
                          y1={`${Math.max(0, Math.min(100, y1))}%`}
                          x2={`${x2}%`}
                          y2={`${Math.max(0, Math.min(100, y2))}%`}
                          stroke="#3B82F6"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Hook to track performance metrics
export const usePerformanceTracking = () => {
  const trackRender = useCallback((componentName: string) => {
    performance.mark(`${componentName}-start`);
    return () => {
      performance.mark(`${componentName}-end`);
      performance.measure(
        `${componentName}-render`,
        `${componentName}-start`,
        `${componentName}-end`,
      );
    };
  }, []);

  const trackError = useCallback((error: Error) => {
    (window as any).__performanceErrors =
      ((window as any).__performanceErrors || 0) + 1;
    console.error('[Performance] Error tracked:', error);
  }, []);

  return { trackRender, trackError };
};

export default PerformanceMonitor;
