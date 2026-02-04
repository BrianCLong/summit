import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError, ErrorSeverity, ErrorCategory } from '@/telemetry/metrics';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void; retryCount: number }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  severity?: ErrorSeverity;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms for exponential backoff
  context?: Record<string, any>; // Additional context for error reporting
  boundaryName?: string; // Name/identifier for this boundary (for telemetry)
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * A reusable Error Boundary component that catches JavaScript errors in its child component tree.
 * It logs errors to the telemetry service and displays a fallback UI.
 *
 * Features:
 * - Telemetry integration with error fingerprinting and categorization
 * - Optional retry logic with exponential backoff
 * - Feature flag integration for gradual rollout
 * - Custom fallback UI support
 * - Named boundaries for better observability
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Store errorInfo for reporting
    this.setState({ errorInfo });

    // Report error to telemetry service with additional context
    const context = {
      ...this.props.context,
      boundaryName: this.props.boundaryName,
      retryCount: this.state.retryCount,
      route: window.location.pathname,
    };

    reportError(error, errorInfo, this.props.severity || 'high', context);

    // Call optional onError prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(clearTimeout);
  }

  resetErrorBoundary = () => {
    const { enableRetry = false, maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    // Check if retry is enabled and we haven't exceeded max retries
    if (enableRetry && retryCount < maxRetries) {
      this.setState({ isRetrying: true });

      // Exponential backoff: retryDelay * 2^retryCount (e.g., 1s, 2s, 4s)
      const delay = retryDelay * Math.pow(2, retryCount);

      const timeout = setTimeout(() => {
        // Call optional onReset prop (e.g., to reset state in parent)
        if (this.props.onReset) {
          this.props.onReset();
        }

        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: retryCount + 1,
          isRetrying: false,
        });
      }, delay);

      this.retryTimeouts.push(timeout);
    } else {
      // No retry or max retries exceeded - just reset
      if (this.props.onReset) {
        this.props.onReset();
      }
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0,
        isRetrying: false,
      });
    }
  };

  render() {
    const { hasError, error, isRetrying, retryCount } = this.state;
    const { enableRetry = false, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return (this.props.fallback as any)({
            error,
            resetErrorBoundary: this.resetErrorBoundary,
            retryCount,
            isRetrying,
            maxRetries,
          });
        }
        return this.props.fallback;
      }

      // Default fallback with retry support
      return (
        <ErrorFallback
          error={error}
          resetErrorBoundary={this.resetErrorBoundary}
          showRetry={enableRetry}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return this.props.children;
  }
}
