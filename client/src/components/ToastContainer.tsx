/* eslint-disable react-refresh/only-export-components */
import React, { useState, useCallback } from 'react';
import Toast, { ToastProps } from './Toast';

/**
 * Interface defining the methods available in the Toast context.
 */
interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

/**
 * Hook to access the Toast context.
 * Must be used within a ToastProvider.
 *
 * @returns The ToastContextType with methods to manage toasts.
 */
export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Provider component for the Toast notification system.
 * Manages the state of active toasts and renders the toast container.
 *
 * @param props - The component props.
 * @param props.children - The child components.
 * @param props.maxToasts - Maximum number of visible toasts (default: 5).
 * @param props.position - Screen position for the toast container (default: 'top-right').
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right',
}) => {
  const [toasts, setToasts] = useState<(ToastProps & { timestamp: number })[]>(
    [],
  );

  const addToast = useCallback(
    (toastData: Omit<ToastProps, 'id' | 'onDismiss'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast = {
        ...toastData,
        id,
        timestamp: Date.now(),
        onDismiss: (toastId: string) => removeToast(toastId),
      };

      setToasts((current) => {
        const updated = [newToast, ...current];
        // Limit number of toasts
        if (updated.length > maxToasts) {
          return updated.slice(0, maxToasts);
        }
        return updated;
      });

      return id;
    },
    [maxToasts],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    clearAllToasts,
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div
        className={`fixed ${getPositionClasses()} z-50 pointer-events-none`}
        aria-live="assertive"
      >
        <div className="flex flex-col space-y-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Convenience hook providing helper methods for common toast types (success, error, warning, info).
 * Wraps `useToast` for simpler usage.
 *
 * @returns An object with `success`, `error`, `warning`, and `info` functions.
 */
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),

    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),

    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),

    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };
};
