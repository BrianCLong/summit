"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useComponentLifecycle = exports.useNavigationPerformance = exports.useAsyncPerformance = exports.useRenderPerformance = void 0;
const react_1 = require("react");
const PerformanceMonitor_1 = require("../services/PerformanceMonitor");
/**
 * Hook to track component render performance
 */
const useRenderPerformance = (componentName, props) => {
    const renderCountRef = (0, react_1.useRef)(0);
    const renderStartRef = (0, react_1.useRef)(Date.now());
    (0, react_1.useEffect)(() => {
        const renderTime = Date.now() - renderStartRef.current;
        renderCountRef.current += 1;
        PerformanceMonitor_1.performanceMonitor.trackRender(componentName, renderTime, props);
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
exports.useRenderPerformance = useRenderPerformance;
/**
 * Hook to measure async operation performance
 */
const useAsyncPerformance = () => {
    const measure = (0, react_1.useCallback)(async (name, operation, category) => {
        PerformanceMonitor_1.performanceMonitor.mark(name);
        try {
            const result = await operation();
            PerformanceMonitor_1.performanceMonitor.measure(name, category);
            return result;
        }
        catch (error) {
            PerformanceMonitor_1.performanceMonitor.measure(name, category, { error: true });
            throw error;
        }
    }, []);
    return { measure };
};
exports.useAsyncPerformance = useAsyncPerformance;
/**
 * Hook to track navigation performance
 */
const useNavigationPerformance = () => {
    const previousRouteRef = (0, react_1.useRef)('');
    const navigationStartRef = (0, react_1.useRef)(Date.now());
    const trackNavigation = (0, react_1.useCallback)((routeName) => {
        const duration = Date.now() - navigationStartRef.current;
        if (previousRouteRef.current) {
            PerformanceMonitor_1.performanceMonitor.trackNavigation(previousRouteRef.current, routeName, duration);
        }
        previousRouteRef.current = routeName;
        navigationStartRef.current = Date.now();
    }, []);
    return { trackNavigation };
};
exports.useNavigationPerformance = useNavigationPerformance;
/**
 * Hook to monitor component mount/unmount
 */
const useComponentLifecycle = (componentName) => {
    const mountTimeRef = (0, react_1.useRef)(Date.now());
    (0, react_1.useEffect)(() => {
        const mountDuration = Date.now() - mountTimeRef.current;
        PerformanceMonitor_1.performanceMonitor.recordMetric({
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
            PerformanceMonitor_1.performanceMonitor.recordMetric({
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
exports.useComponentLifecycle = useComponentLifecycle;
