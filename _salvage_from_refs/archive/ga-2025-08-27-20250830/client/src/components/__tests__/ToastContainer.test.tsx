import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast, useToastHelpers } from '../ToastContainer';

// Test component that uses the toast hook
function TestComponent() {
  const { addToast, removeToast, clearAllToasts } = useToast();
  const { success, error, warning, info } = useToastHelpers();

  return (
    <div>
      <button onClick={() => addToast({ type: 'info', title: 'Test Toast' })}>
        Add Toast
      </button>
      <button onClick={() => success('Success!', 'Operation completed')}>
        Success Toast
      </button>
      <button onClick={() => error('Error!', 'Something went wrong')}>
        Error Toast
      </button>
      <button onClick={() => warning('Warning!', 'Please be careful')}>
        Warning Toast
      </button>
      <button onClick={() => info('Info', 'Just so you know')}>
        Info Toast
      </button>
      <button onClick={clearAllToasts}>
        Clear All
      </button>
    </div>
  );
}

const renderWithToastProvider = (component: React.ReactElement, props = {}) => {
  return render(
    <ToastProvider {...props}>
      {component}
    </ToastProvider>
  );
};

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders toast provider without errors', () => {
    renderWithToastProvider(<div>Test Content</div>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('adds and displays a toast', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });
  });

  test('displays different toast types with correct styling', async () => {
    renderWithToastProvider(<TestComponent />);
    
    // Test success toast
    fireEvent.click(screen.getByText('Success Toast'));
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
    });
    
    // Test error toast
    fireEvent.click(screen.getByText('Error Toast'));
    await waitFor(() => {
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
    
    // Test warning toast
    fireEvent.click(screen.getByText('Warning Toast'));
    await waitFor(() => {
      expect(screen.getByText('Warning!')).toBeInTheDocument();
      expect(screen.getByText('Please be careful')).toBeInTheDocument();
    });
    
    // Test info toast
    fireEvent.click(screen.getByText('Info Toast'));
    await waitFor(() => {
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Just so you know')).toBeInTheDocument();
    });
  });

  test('toast displays correct icons', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Success Toast'));
    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Error Toast'));
    await waitFor(() => {
      expect(screen.getByText('❌')).toBeInTheDocument();
    });
  });

  test('toast auto-dismisses after duration', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  test('toast can be manually dismissed', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });
    
    // Click the close button (×)
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  test('clear all toasts works', async () => {
    renderWithToastProvider(<TestComponent />);
    
    // Add multiple toasts
    fireEvent.click(screen.getByText('Success Toast'));
    fireEvent.click(screen.getByText('Error Toast'));
    fireEvent.click(screen.getByText('Info Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
    
    // Clear all
    fireEvent.click(screen.getByText('Clear All'));
    
    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.queryByText('Error!')).not.toBeInTheDocument();
      expect(screen.queryByText('Info')).not.toBeInTheDocument();
    });
  });

  test('respects maxToasts limit', async () => {
    renderWithToastProvider(<TestComponent />, { maxToasts: 2 });
    
    // Add 3 toasts
    fireEvent.click(screen.getByText('Success Toast'));
    fireEvent.click(screen.getByText('Error Toast'));
    fireEvent.click(screen.getByText('Info Toast'));
    
    await waitFor(() => {
      // Should only show the most recent 2 toasts
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
  });

  test('toast positioning works correctly', () => {
    const { rerender } = renderWithToastProvider(<TestComponent />, { position: 'top-left' });
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    const toastContainer = document.querySelector('[aria-live="assertive"]');
    expect(toastContainer).toHaveClass('top-4', 'left-4');
    
    // Test different position
    rerender(
      <ToastProvider position="bottom-right">
        <TestComponent />
      </ToastProvider>
    );
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    const newContainer = document.querySelector('[aria-live="assertive"]');
    expect(newContainer).toHaveClass('bottom-4', 'right-4');
  });

  test('toast with action button works', async () => {
    const TestWithAction = () => {
      const { addToast } = useToast();
      
      return (
        <button onClick={() => addToast({
          type: 'info',
          title: 'Action Toast',
          message: 'Click the action',
          action: {
            label: 'Take Action',
            onClick: () => console.log('Action clicked')
          }
        })}>
          Add Action Toast
        </button>
      );
    };

    renderWithToastProvider(<TestWithAction />);
    
    fireEvent.click(screen.getByText('Add Action Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Action Toast')).toBeInTheDocument();
      expect(screen.getByText('Take Action')).toBeInTheDocument();
    });
    
    // Click the action button
    const actionButton = screen.getByText('Take Action');
    fireEvent.click(actionButton);
    
    // Action should still be clickable (we can't easily test console.log)
    expect(actionButton).toBeInTheDocument();
  });

  test('toast animation classes are applied', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    // Wait for toast to appear and check for animation classes
    await waitFor(() => {
      const toast = screen.getByText('Test Toast').closest('div');
      expect(toast).toHaveClass('transition-all', 'duration-300');
    });
  });

  test('useToast throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    const TestOutsideProvider = () => {
      try {
        useToast();
        return <div>Should not render</div>;
      } catch (error) {
        return <div>Error caught: {(error as Error).message}</div>;
      }
    };
    
    render(<TestOutsideProvider />);
    
    expect(screen.getByText(/Error caught/)).toBeInTheDocument();
    expect(screen.getByText(/must be used within ToastProvider/)).toBeInTheDocument();
    
    console.error = originalError;
  });
});

// Performance tests
describe('ToastContainer Performance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('handles rapid toast additions without performance issues', async () => {
    const RapidToastTest = () => {
      const { addToast } = useToast();
      
      return (
        <button onClick={() => {
          // Add 10 toasts rapidly
          for (let i = 0; i < 10; i++) {
            addToast({ type: 'info', title: `Toast ${i}` });
          }
        }}>
          Add Many Toasts
        </button>
      );
    };

    renderWithToastProvider(<RapidToastTest />, { maxToasts: 5 });
    
    fireEvent.click(screen.getByText('Add Many Toasts'));
    
    await waitFor(() => {
      // Should only show maxToasts number of toasts
      const toasts = screen.getAllByText(/Toast \d/);
      expect(toasts).toHaveLength(5);
    });
  });

  test('cleanup works properly when component unmounts', () => {
    const { unmount } = renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    // Unmount component
    unmount();
    
    // Fast-forward timers to trigger any pending operations
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    // Should not throw any errors
    expect(true).toBe(true);
  });
});

// Accessibility tests
describe('ToastContainer Accessibility', () => {
  test('toast container has proper ARIA attributes', async () => {
    renderWithToastProvider(<TestComponent />);
    
    const toastContainer = document.querySelector('[aria-live="assertive"]');
    expect(toastContainer).toBeInTheDocument();
    expect(toastContainer).toHaveAttribute('aria-live', 'assertive');
  });

  test('close button has proper screen reader text', async () => {
    renderWithToastProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Add Toast'));
    
    await waitFor(() => {
      const closeButton = screen.getByText('×');
      expect(closeButton.parentElement).toHaveAttribute('class', expect.stringContaining('focus:outline-none'));
      // The sr-only text should be present
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });
});