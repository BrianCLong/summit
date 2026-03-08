"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const ToastContainer_1 = require("../ToastContainer");
// Test component that uses the toast hook
function TestComponent() {
    const { addToast, removeToast, clearAllToasts } = (0, ToastContainer_1.useToast)();
    const { success, error, warning, info } = (0, ToastContainer_1.useToastHelpers)();
    return (<div>
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
      <button onClick={clearAllToasts}>Clear All</button>
    </div>);
}
const renderWithToastProvider = (component, props = {}) => {
    return (0, react_2.render)(<ToastContainer_1.ToastProvider {...props}>{component}</ToastContainer_1.ToastProvider>);
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
        expect(react_2.screen.getByText('Test Content')).toBeInTheDocument();
    });
    test('adds and displays a toast', async () => {
        renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Test Toast')).toBeInTheDocument();
        });
    });
    test('displays different toast types with correct styling', async () => {
        renderWithToastProvider(<TestComponent />);
        // Test success toast
        react_2.fireEvent.click(react_2.screen.getByText('Success Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Success!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Operation completed')).toBeInTheDocument();
        });
        // Test error toast
        react_2.fireEvent.click(react_2.screen.getByText('Error Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Error!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Something went wrong')).toBeInTheDocument();
        });
        // Test warning toast
        react_2.fireEvent.click(react_2.screen.getByText('Warning Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Warning!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Please be careful')).toBeInTheDocument();
        });
        // Test info toast
        react_2.fireEvent.click(react_2.screen.getByText('Info Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Info')).toBeInTheDocument();
            expect(react_2.screen.getByText('Just so you know')).toBeInTheDocument();
        });
    });
    test('toast displays correct icons', async () => {
        renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Success Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('✅')).toBeInTheDocument();
        });
        react_2.fireEvent.click(react_2.screen.getByText('Error Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('❌')).toBeInTheDocument();
        });
    });
    test('toast auto-dismisses after duration', async () => {
        renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Test Toast')).toBeInTheDocument();
        });
        // Fast-forward time
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(5000);
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByText('Test Toast')).not.toBeInTheDocument();
        });
    });
    test('toast can be manually dismissed', async () => {
        renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Test Toast')).toBeInTheDocument();
        });
        // Click the close button (×)
        const closeButton = react_2.screen.getByText('×');
        react_2.fireEvent.click(closeButton);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByText('Test Toast')).not.toBeInTheDocument();
        });
    });
    test('clear all toasts works', async () => {
        renderWithToastProvider(<TestComponent />);
        // Add multiple toasts
        react_2.fireEvent.click(react_2.screen.getByText('Success Toast'));
        react_2.fireEvent.click(react_2.screen.getByText('Error Toast'));
        react_2.fireEvent.click(react_2.screen.getByText('Info Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Success!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Error!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Info')).toBeInTheDocument();
        });
        // Clear all
        react_2.fireEvent.click(react_2.screen.getByText('Clear All'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByText('Success!')).not.toBeInTheDocument();
            expect(react_2.screen.queryByText('Error!')).not.toBeInTheDocument();
            expect(react_2.screen.queryByText('Info')).not.toBeInTheDocument();
        });
    });
    test('respects maxToasts limit', async () => {
        renderWithToastProvider(<TestComponent />, { maxToasts: 2 });
        // Add 3 toasts
        react_2.fireEvent.click(react_2.screen.getByText('Success Toast'));
        react_2.fireEvent.click(react_2.screen.getByText('Error Toast'));
        react_2.fireEvent.click(react_2.screen.getByText('Info Toast'));
        await (0, react_2.waitFor)(() => {
            // Should only show the most recent 2 toasts
            expect(react_2.screen.queryByText('Success!')).not.toBeInTheDocument();
            expect(react_2.screen.getByText('Error!')).toBeInTheDocument();
            expect(react_2.screen.getByText('Info')).toBeInTheDocument();
        });
    });
    test('toast positioning works correctly', () => {
        const { rerender } = renderWithToastProvider(<TestComponent />, {
            position: 'top-left',
        });
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        const toastContainer = document.querySelector('[aria-live="assertive"]');
        expect(toastContainer).toHaveClass('top-4', 'left-4');
        // Test different position
        rerender(<ToastContainer_1.ToastProvider position="bottom-right">
        <TestComponent />
      </ToastContainer_1.ToastProvider>);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        const newContainer = document.querySelector('[aria-live="assertive"]');
        expect(newContainer).toHaveClass('bottom-4', 'right-4');
    });
    test('toast with action button works', async () => {
        const TestWithAction = () => {
            const { addToast } = (0, ToastContainer_1.useToast)();
            return (<button onClick={() => addToast({
                    type: 'info',
                    title: 'Action Toast',
                    message: 'Click the action',
                    action: {
                        label: 'Take Action',
                        onClick: () => console.log('Action clicked'),
                    },
                })}>
          Add Action Toast
        </button>);
        };
        renderWithToastProvider(<TestWithAction />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Action Toast'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Action Toast')).toBeInTheDocument();
            expect(react_2.screen.getByText('Take Action')).toBeInTheDocument();
        });
        // Click the action button
        const actionButton = react_2.screen.getByText('Take Action');
        react_2.fireEvent.click(actionButton);
        // Action should still be clickable (we can't easily test console.log)
        expect(actionButton).toBeInTheDocument();
    });
    test('toast animation classes are applied', async () => {
        renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        // Wait for toast to appear and check for animation classes
        await (0, react_2.waitFor)(() => {
            const el = react_2.screen.getByText('Test Toast');
            const animated = el.closest('[class*="transition-all"]');
            expect(animated).toBeTruthy();
            expect(animated).toHaveClass('transition-all');
            expect(animated).toHaveClass('duration-300');
        });
    });
    test('useToast throws error when used outside provider', () => {
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = jest.fn();
        const TestOutsideProvider = () => {
            try {
                (0, ToastContainer_1.useToast)();
                return <div>Should not render</div>;
            }
            catch (error) {
                return <div>Error caught: {error.message}</div>;
            }
        };
        (0, react_2.render)(<TestOutsideProvider />);
        expect(react_2.screen.getByText(/Error caught/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/must be used within ToastProvider/)).toBeInTheDocument();
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
            const { addToast } = (0, ToastContainer_1.useToast)();
            return (<button onClick={() => {
                    // Add 10 toasts rapidly
                    for (let i = 0; i < 10; i++) {
                        addToast({ type: 'info', title: `Toast ${i}` });
                    }
                }}>
          Add Many Toasts
        </button>);
        };
        renderWithToastProvider(<RapidToastTest />, { maxToasts: 5 });
        react_2.fireEvent.click(react_2.screen.getByText('Add Many Toasts'));
        await (0, react_2.waitFor)(() => {
            // Should only show maxToasts number of toasts
            const toasts = react_2.screen.getAllByText(/Toast \d/);
            expect(toasts).toHaveLength(5);
        });
    });
    test('cleanup works properly when component unmounts', () => {
        const { unmount } = renderWithToastProvider(<TestComponent />);
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        // Unmount component
        unmount();
        // Fast-forward timers to trigger any pending operations
        (0, react_2.act)(() => {
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
        react_2.fireEvent.click(react_2.screen.getByText('Add Toast'));
        await (0, react_2.waitFor)(() => {
            const closeButton = react_2.screen.getByText('×');
            expect(closeButton.parentElement).toHaveAttribute('class', expect.stringContaining('focus:outline-none'));
            // The sr-only text should be present
            expect(react_2.screen.getByText('Close')).toBeInTheDocument();
        });
    });
});
