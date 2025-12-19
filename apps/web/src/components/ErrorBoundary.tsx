import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Production-grade Error Boundary
 * catches errors in React component tree, logs to Sentry (mock), and displays fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log to Sentry or Analytics
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // In a real implementation, we would call Sentry.captureException(error, { extra: errorInfo });
    // This is mocked for now as per instructions.
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 m-4 border border-red-200 bg-red-50 rounded-lg shadow-sm">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 mb-4 max-w-md">
              {this.props.componentName
                ? `An error occurred in the ${this.props.componentName} component.`
                : 'An unexpected error occurred while rendering this component.'}
            </p>
            {this.state.error && (
                <pre className="text-xs text-left bg-white p-2 rounded border border-red-100 mb-4 w-full overflow-auto max-h-32">
                    {this.state.error.message}
                </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
