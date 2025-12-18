import React from 'react';

interface Props {
  children: React.ReactNode;
  componentName?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Log to backend
    // We use a fire-and-forget approach here to not block the UI
    fetch('/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Attempt to extract tenant ID if available in localStorage
        'x-tenant-id': localStorage.getItem('tenantId') || 'unknown'
      },
      body: JSON.stringify({
        event: 'ui_error_boundary',
        labels: {
          component: this.props.componentName || 'unknown',
          message: error.message,
          // Truncate stack if too long
          stack: errorInfo.componentStack?.substring(0, 1000)
        }
      })
    }).catch(e => console.error('Failed to report error to backend:', e));
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 text-red-900 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">
            Something went wrong in {this.props.componentName || 'this component'}.
          </h3>
          <p className="mb-4 text-sm opacity-80">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
