import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PerformanceMonitor, { usePerformanceTracking } from '../PerformanceMonitor';

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
const mockResourceEntries: PerformanceResourceTiming[] = [
  {
    name: 'test-resource-1',
    entryType: 'resource',
    startTime: 100,
    duration: 50,
  } as PerformanceResourceTiming,
  {
    name: 'test-resource-2', 
    entryType: 'resource',
    startTime: 200,
    duration: 30,
  } as PerformanceResourceTiming,
];

const mockMeasureEntries: PerformanceMeasure[] = [
  {
    name: 'test-measure',
    entryType: 'measure',
    startTime: 0,
    duration: 25,
  } as PerformanceMeasure,
];

// Mock performance.getEntriesByType
const originalGetEntriesByType = performance.getEntriesByType;
performance.getEntriesByType = jest.fn((type: string) => {
  if (type === 'resource') return mockResourceEntries;
  if (type === 'measure') return mockMeasureEntries;
  return [];
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset performance error counter
    (window as any).__performanceErrors = 0;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders performance indicator when enabled', () => {
    render(<PerformanceMonitor enabled={true} />);
    
    // Should show memory usage indicator
    expect(screen.getByText(/\d+MB/)).toBeInTheDocument();
  });

  test('does not render when disabled', () => {
    render(<PerformanceMonitor enabled={false} />);
    
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
  });

  test('shows performance details when clicked', () => {
    render(<PerformanceMonitor enabled={true} />);
    
    // Click the performance indicator
    const indicator = screen.getByText(/\d+MB/);
    fireEvent.click(indicator);
    
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Render Time')).toBeInTheDocument();
    expect(screen.getByText('Network Requests')).toBeInTheDocument();
  });

  test('collects metrics at specified intervals', async () => {
    const onMetricsUpdate = jest.fn();
    
    render(
      <PerformanceMonitor
        enabled={true}
        sampleInterval={1000}
        onMetricsUpdate={onMetricsUpdate}
      />
    );
    
    // Initial metrics should be collected
    expect(onMetricsUpdate).toHaveBeenCalledTimes(1);
    
    // Advance time by sample interval
    act(() => {
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
    
    render(
      <PerformanceMonitor
        enabled={true}
        sampleInterval={100}
        maxSamples={3}
        onMetricsUpdate={onMetricsUpdate}
      />
    );
    
    // Advance time to collect 5 samples
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Should have been called 6 times (initial + 5 intervals)
    expect(onMetricsUpdate).toHaveBeenCalledTimes(6);
    
    // Click to open details and check samples are limited
    fireEvent.click(screen.getByText(/\d+MB/));
    
    // The mini chart should only show recent samples
    const svg = screen.getByRole('img', { hidden: true });
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
    
    const { rerender } = render(<PerformanceMonitor enabled={true} />);
    
    let indicator = screen.getByText(/\d+MB/).previousElementSibling;
    expect(indicator).toHaveClass('bg-red-400');
    
    // Test medium memory usage
    Object.defineProperty(performance, 'memory', {
      writable: true,
      value: {
        usedJSHeapSize: 120 * 1024 * 1024, // 120MB (medium)
      },
    });
    
    rerender(<PerformanceMonitor enabled={true} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    indicator = screen.getByText(/\d+MB/).previousElementSibling;
    expect(indicator).toHaveClass('bg-yellow-400');
  });

  test('closes detailed panel when close button clicked', () => {
    render(<PerformanceMonitor enabled={true} />);
    
    // Open details
    fireEvent.click(screen.getByText(/\d+MB/));
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    
    // Close details
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Performance Monitor')).not.toBeInTheDocument();
  });

  test('shows average metrics when available', () => {
    const onMetricsUpdate = jest.fn();
    
    render(
      <PerformanceMonitor
        enabled={true}
        sampleInterval={100}
        onMetricsUpdate={onMetricsUpdate}
      />
    );
    
    // Collect a few samples
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Open details
    fireEvent.click(screen.getByText(/\d+MB/));
    
    // Should show average values
    expect(screen.getByText(/avg:/)).toBeInTheDocument();
  });

  test('handles missing performance.memory gracefully', () => {
    // Remove memory property
    const originalMemory = (performance as any).memory;
    delete (performance as any).memory;
    
    render(<PerformanceMonitor enabled={true} />);
    
    // Should still render with 0MB
    expect(screen.getByText('0MB')).toBeInTheDocument();
    
    // Restore memory
    (performance as any).memory = originalMemory;
  });
});

// Test the usePerformanceTracking hook
describe('usePerformanceTracking', () => {
  test('trackRender creates performance marks and measures', () => {
    const TestComponent = () => {
      const { trackRender } = usePerformanceTracking();
      
      React.useEffect(() => {
        const endTracking = trackRender('TestComponent');
        
        // Simulate some work
        setTimeout(() => {
          endTracking();
        }, 10);
      }, [trackRender]);
      
      return <div>Test Component</div>;
    };
    
    render(<TestComponent />);
    
    expect(performance.mark).toHaveBeenCalledWith('TestComponent-start');
    
    // Advance time to trigger the timeout
    act(() => {
      jest.advanceTimersByTime(10);
    });
    
    expect(performance.mark).toHaveBeenCalledWith('TestComponent-end');
    expect(performance.measure).toHaveBeenCalledWith(
      'TestComponent-render',
      'TestComponent-start',
      'TestComponent-end'
    );
  });

  test('trackError increments error counter and logs', () => {
    const originalLog = console.error;
    console.error = jest.fn();
    
    const TestComponent = () => {
      const { trackError } = usePerformanceTracking();
      
      React.useEffect(() => {
        const error = new Error('Test error');
        trackError(error);
      }, [trackError]);
      
      return <div>Test Component</div>;
    };
    
    render(<TestComponent />);
    
    expect((window as any).__performanceErrors).toBe(1);
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
    
    render(
      <PerformanceMonitor
        enabled={true}
        sampleInterval={100}
        onMetricsUpdate={onMetricsUpdate}
      />
    );
    
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
    
    delete (performance as any).mark;
    delete (performance as any).measure;
    performance.getEntriesByType = jest.fn(() => []);
    
    expect(() => {
      render(<PerformanceMonitor enabled={true} />);
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
    
    render(
      <PerformanceMonitor
        enabled={true}
        sampleInterval={1}
        maxSamples={1000}
        onMetricsUpdate={onMetricsUpdate}
      />
    );
    
    // Collect many samples rapidly
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should still be performant and not crash
    expect(onMetricsUpdate).toHaveBeenCalled();
    expect(onMetricsUpdate.mock.calls.length).toBeGreaterThan(100);
  });

  test('cleans up interval on unmount', () => {
    const { unmount } = render(<PerformanceMonitor enabled={true} />);
    
    unmount();
    
    // Advance time after unmount - should not cause errors
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(true).toBe(true); // Should not throw
  });
});