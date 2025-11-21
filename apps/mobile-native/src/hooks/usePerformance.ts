import {useEffect, useRef, useCallback} from 'react';
import {performanceMonitor} from '../services/PerformanceMonitor';

/**
 * Hook to track component render performance
 */
export const useRenderPerformance = (componentName: string, props?: any) => {
  const renderCountRef = useRef(0);
  const renderStartRef = useRef(Date.now());

  useEffect(() => {
    const renderTime = Date.now() - renderStartRef.current;
    renderCountRef.current += 1;

    performanceMonitor.trackRender(componentName, renderTime, props);

    // Warn about excessive renders
    if (renderCountRef.current > 10) {
      console.warn(`[Performance] ${componentName} has rendered ${renderCountRef.current} times`);
    }

    // Reset for next render
    renderStartRef.current = Date.now();
  });

  return {
    renderCount: renderCountRef.current,
  };
};

/**
 * Hook to measure async operation performance
 */
export const useAsyncPerformance = () => {
  const measure = useCallback(async <T,>(
    name: string,
    operation: () => Promise<T>,
    category?: 'startup' | 'render' | 'network' | 'storage' | 'custom',
  ): Promise<T> => {
    performanceMonitor.mark(name);

    try {
      const result = await operation();
      performanceMonitor.measure(name, category);
      return result;
    } catch (error) {
      performanceMonitor.measure(name, category, {error: true});
      throw error;
    }
  }, []);

  return {measure};
};

/**
 * Hook to track navigation performance
 */
export const useNavigationPerformance = () => {
  const previousRouteRef = useRef<string>('');
  const navigationStartRef = useRef(Date.now());

  const trackNavigation = useCallback((routeName: string) => {
    const duration = Date.now() - navigationStartRef.current;

    if (previousRouteRef.current) {
      performanceMonitor.trackNavigation(previousRouteRef.current, routeName, duration);
    }

    previousRouteRef.current = routeName;
    navigationStartRef.current = Date.now();
  }, []);

  return {trackNavigation};
};

/**
 * Hook to monitor component mount/unmount
 */
export const useComponentLifecycle = (componentName: string) => {
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    const mountDuration = Date.now() - mountTimeRef.current;

    performanceMonitor.recordMetric({
      name: `mount_${componentName}`,
      value: mountDuration,
      unit: 'ms',
      category: 'render',
      metadata: {
        component: componentName,
        lifecycle: 'mount',
      },
    });

    return () => {
      const unmountTime = Date.now();
      const lifetimeDuration = unmountTime - mountTimeRef.current;

      performanceMonitor.recordMetric({
        name: `lifetime_${componentName}`,
        value: lifetimeDuration,
        unit: 'ms',
        category: 'render',
        metadata: {
          component: componentName,
          lifecycle: 'unmount',
        },
      });
    };
  }, [componentName]);
};
