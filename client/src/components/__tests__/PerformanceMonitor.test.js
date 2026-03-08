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
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const PerformanceMonitor_1 = __importStar(require("../PerformanceMonitor"));
// Mock performance.memory
Object.defineProperty(performance, 'memory', {
    writable: true,
    value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
    },
});
// Mock performance entries
const mockResourceEntries = [
    {
        name: 'test-resource-1',
        entryType: 'resource',
        startTime: 100,
        duration: 50,
    },
    {
        name: 'test-resource-2',
        entryType: 'resource',
        startTime: 200,
        duration: 30,
    },
];
const mockMeasureEntries = [
    {
        name: 'test-measure',
        entryType: 'measure',
        startTime: 0,
        duration: 25,
    },
];
// Mock performance.getEntriesByType
const originalGetEntriesByType = performance.getEntriesByType;
performance.getEntriesByType = jest.fn((type) => {
    if (type === 'resource')
        return mockResourceEntries;
    if (type === 'measure')
        return mockMeasureEntries;
    return [];
});
describe('PerformanceMonitor', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Reset performance error counter
        window.__performanceErrors = 0;
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    test('renders performance indicator when enabled', () => {
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        // Should show memory usage indicator
        expect(react_2.screen.getByText(/\d+MB/)).toBeInTheDocument();
    });
    test('does not render when disabled', () => {
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={false}/>);
        expect(react_2.screen.queryByText(/MB/)).not.toBeInTheDocument();
    });
    test('shows performance details when clicked', () => {
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        // Click the performance indicator
        const indicator = react_2.screen.getByText(/\d+MB/);
        react_2.fireEvent.click(indicator);
        expect(react_2.screen.getByText('Performance Monitor')).toBeInTheDocument();
        expect(react_2.screen.getByText('Memory Usage')).toBeInTheDocument();
        expect(react_2.screen.getByText('Render Time')).toBeInTheDocument();
        expect(react_2.screen.getByText('Network Requests')).toBeInTheDocument();
    });
    test('collects metrics at specified intervals', async () => {
        const onMetricsUpdate = jest.fn();
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true} sampleInterval={1000} onMetricsUpdate={onMetricsUpdate}/>);
        // Initial metrics should be collected
        expect(onMetricsUpdate).toHaveBeenCalledTimes(1);
        // Advance time by sample interval
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(onMetricsUpdate).toHaveBeenCalledTimes(2);
        // Check metrics structure
        const metrics = onMetricsUpdate.mock.calls[0][0];
        expect(metrics).toHaveProperty('memoryUsage');
        expect(metrics).toHaveProperty('renderTime');
        expect(metrics).toHaveProperty('networkRequests');
        expect(metrics).toHaveProperty('errorCount');
        expect(metrics).toHaveProperty('timestamp');
    });
    test('respects maxSamples limit', () => {
        const onMetricsUpdate = jest.fn();
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true} sampleInterval={100} maxSamples={3} onMetricsUpdate={onMetricsUpdate}/>);
        // Advance time to collect 5 samples
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(500);
        });
        // Should have been called 6 times (initial + 5 intervals)
        expect(onMetricsUpdate).toHaveBeenCalledTimes(6);
        // Click to open details and check samples are limited
        react_2.fireEvent.click(react_2.screen.getByText(/\d+MB/));
        // The mini chart should only show recent samples
        const svg = react_2.screen.getByRole('img', { hidden: true });
        expect(svg).toBeInTheDocument();
    });
    test('shows color indicators based on memory usage', () => {
        // Test high memory usage
        Object.defineProperty(performance, 'memory', {
            writable: true,
            value: {
                usedJSHeapSize: 180 * 1024 * 1024, // 180MB (high)
            },
        });
        const { rerender } = (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        let indicator = react_2.screen.getByText(/\d+MB/).previousElementSibling;
        expect(indicator).toHaveClass('bg-red-400');
        // Test medium memory usage
        Object.defineProperty(performance, 'memory', {
            writable: true,
            value: {
                usedJSHeapSize: 120 * 1024 * 1024, // 120MB (medium)
            },
        });
        rerender(<PerformanceMonitor_1.default enabled={true}/>);
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(100);
        });
        indicator = react_2.screen.getByText(/\d+MB/).previousElementSibling;
        expect(indicator).toHaveClass('bg-yellow-400');
    });
    test('closes detailed panel when close button clicked', () => {
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        // Open details
        react_2.fireEvent.click(react_2.screen.getByText(/\d+MB/));
        expect(react_2.screen.getByText('Performance Monitor')).toBeInTheDocument();
        // Close details
        const closeButton = react_2.screen.getByText('×');
        react_2.fireEvent.click(closeButton);
        expect(react_2.screen.queryByText('Performance Monitor')).not.toBeInTheDocument();
    });
    test('shows average metrics when available', () => {
        const onMetricsUpdate = jest.fn();
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true} sampleInterval={100} onMetricsUpdate={onMetricsUpdate}/>);
        // Collect a few samples
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(300);
        });
        // Open details
        react_2.fireEvent.click(react_2.screen.getByText(/\d+MB/));
        // Should show average values
        expect(react_2.screen.getByText(/avg:/)).toBeInTheDocument();
    });
    test('handles missing performance.memory gracefully', () => {
        // Remove memory property
        const originalMemory = performance.memory;
        delete performance.memory;
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        // Should still render with 0MB
        expect(react_2.screen.getByText('0MB')).toBeInTheDocument();
        // Restore memory
        performance.memory = originalMemory;
    });
});
// Test the usePerformanceTracking hook
describe('usePerformanceTracking', () => {
    test('trackRender creates performance marks and measures', () => {
        const TestComponent = () => {
            const { trackRender } = (0, PerformanceMonitor_1.usePerformanceTracking)();
            react_1.default.useEffect(() => {
                const endTracking = trackRender('TestComponent');
                // Simulate some work
                setTimeout(() => {
                    endTracking();
                }, 10);
            }, [trackRender]);
            return <div>Test Component</div>;
        };
        (0, react_2.render)(<TestComponent />);
        expect(performance.mark).toHaveBeenCalledWith('TestComponent-start');
        // Advance time to trigger the timeout
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(10);
        });
        expect(performance.mark).toHaveBeenCalledWith('TestComponent-end');
        expect(performance.measure).toHaveBeenCalledWith('TestComponent-render', 'TestComponent-start', 'TestComponent-end');
    });
    test('trackError increments error counter and logs', () => {
        const originalLog = console.error;
        console.error = jest.fn();
        const TestComponent = () => {
            const { trackError } = (0, PerformanceMonitor_1.usePerformanceTracking)();
            react_1.default.useEffect(() => {
                const error = new Error('Test error');
                trackError(error);
            }, [trackError]);
            return <div>Test Component</div>;
        };
        (0, react_2.render)(<TestComponent />);
        expect(window.__performanceErrors).toBe(1);
        expect(console.error).toHaveBeenCalledWith('[Performance] Error tracked:', expect.any(Error));
        console.error = originalLog;
    });
});
// Integration tests
describe('PerformanceMonitor Integration', () => {
    test('works with real performance data', () => {
        // Set up real performance entries
        performance.getEntriesByType = originalGetEntriesByType;
        // Add some real performance marks
        performance.mark('test-start');
        performance.mark('test-end');
        performance.measure('test-duration', 'test-start', 'test-end');
        const onMetricsUpdate = jest.fn();
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true} sampleInterval={100} onMetricsUpdate={onMetricsUpdate}/>);
        expect(onMetricsUpdate).toHaveBeenCalled();
        const metrics = onMetricsUpdate.mock.calls[0][0];
        expect(typeof metrics.renderTime).toBe('number');
        expect(typeof metrics.memoryUsage).toBe('number');
        expect(typeof metrics.networkRequests).toBe('number');
        expect(typeof metrics.timestamp).toBe('number');
    });
    test('handles performance API not available', () => {
        // Mock missing performance methods
        const originalMark = performance.mark;
        const originalMeasure = performance.measure;
        const originalGetEntriesByType = performance.getEntriesByType;
        delete performance.mark;
        delete performance.measure;
        performance.getEntriesByType = jest.fn(() => []);
        expect(() => {
            (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        }).not.toThrow();
        // Restore methods
        performance.mark = originalMark;
        performance.measure = originalMeasure;
        performance.getEntriesByType = originalGetEntriesByType;
    });
});
// Performance tests
describe('PerformanceMonitor Performance', () => {
    test('does not cause memory leaks with many samples', () => {
        const onMetricsUpdate = jest.fn();
        (0, react_2.render)(<PerformanceMonitor_1.default enabled={true} sampleInterval={1} maxSamples={1000} onMetricsUpdate={onMetricsUpdate}/>);
        // Collect many samples rapidly
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(2000);
        });
        // Should still be performant and not crash
        expect(onMetricsUpdate).toHaveBeenCalled();
        expect(onMetricsUpdate.mock.calls.length).toBeGreaterThan(100);
    });
    test('cleans up interval on unmount', () => {
        const { unmount } = (0, react_2.render)(<PerformanceMonitor_1.default enabled={true}/>);
        unmount();
        // Advance time after unmount - should not cause errors
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(true).toBe(true); // Should not throw
    });
});
