/**
 * Page-Level Error Boundary Component
 *
 * Provides granular error handling at the page/feature level,
 * with telemetry integration, retry capabilities, and graceful degradation.
 *
 * Gap Analysis Reference: Gap 7.1 - Add granular error boundaries
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName: string;
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showErrorDetails?: boolean;
  maxRetries?: number;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Report to telemetry
    this.reportError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    const { pageName } = this.props;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[PageErrorBoundary:${pageName}]`, error, errorInfo);
    }

    // Report to telemetry service
    try {
      // Using dynamic import to avoid bundling issues
      import('@/utils/telemetry').then(({ reportError }) => {
        reportError(error, {
          pageName,
          componentStack: errorInfo.componentStack,
          retryCount: this.state.retryCount,
        });
      }).catch(() => {
        // Telemetry not available, log to console
        console.error('Failed to report error to telemetry');
      });
    } catch {
      // Ignore telemetry failures
    }
  }

  private handleRetry = (): void => {
    const { maxRetries = 3, onReset } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
      onReset?.();
    }
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, pageName, showErrorDetails = false, maxRetries = 3 } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback renderer
    if (typeof fallback === 'function' && error) {
      return fallback(error, this.handleRetry);
    }

    // Custom fallback component
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div className="page-error-boundary" style={styles.container}>
        <div style={styles.content}>
          <div style={styles.iconContainer}>
            <svg
              style={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 style={styles.title}>Something went wrong</h2>

          <p style={styles.message}>
            An error occurred while loading <strong>{pageName}</strong>.
            {retryCount > 0 && ` (Retry ${retryCount}/${maxRetries})`}
          </p>

          {showErrorDetails && error && (
            <details style={styles.details}>
              <summary style={styles.summary}>Error Details</summary>
              <pre style={styles.errorText}>
                {error.toString()}
                {errorInfo?.componentStack && (
                  <>
                    {'\n\nComponent Stack:'}
                    {errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          <div style={styles.buttonContainer}>
            {retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Try Again
              </button>
            )}
            <button
              onClick={this.handleReload}
              style={{ ...styles.button, ...styles.secondaryButton }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              style={{ ...styles.button, ...styles.tertiaryButton }}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '24px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    margin: '16px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
  },
  iconContainer: {
    marginBottom: '16px',
  },
  icon: {
    width: '64px',
    height: '64px',
    color: '#dc2626',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 500,
    color: '#991b1b',
  },
  errorText: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#7f1d1d',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflow: 'auto',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
  },
};

/**
 * Higher-order component to wrap a component with PageErrorBoundary
 */
export function withPageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string,
  options?: Omit<PageErrorBoundaryProps, 'children' | 'pageName'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <PageErrorBoundary pageName={pageName} {...options}>
      <WrappedComponent {...props} />
    </PageErrorBoundary>
  );

  WithErrorBoundary.displayName = `withPageErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

/**
 * Feature-level error boundary for smaller component sections
 */
export const FeatureErrorBoundary: React.FC<{
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
}> = ({ children, featureName, fallback }) => (
  <PageErrorBoundary
    pageName={featureName}
    fallback={
      fallback || (
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
          <p style={{ color: '#991b1b', margin: 0 }}>
            Failed to load {featureName}. Please try refreshing the page.
          </p>
        </div>
      )
    }
    showErrorDetails={process.env.NODE_ENV === 'development'}
    maxRetries={2}
  >
    {children}
  </PageErrorBoundary>
);

export default PageErrorBoundary;
