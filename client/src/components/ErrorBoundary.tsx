// client/src/components/ErrorBoundary.tsx
import React from 'react';

/**
 * Logs errors to a telemetry service.
 * Currently logs to console, but should be integrated with OpenTelemetry or Sentry in production.
 *
 * @param error - The error that was thrown.
 * @param errorInfo - Additional information about the error, including the component stack.
 */
function logErrorToTelemetry(error: Error, errorInfo: React.ErrorInfo) {
  // Old: // TODO: wire to your telemetry
  console.log('Logging error to telemetry service...');
  console.log({
    error: error.toString(),
    componentStack: errorInfo.componentStack,
  });
  // In a real app, you would use a library like OpenTelemetry or Sentry here.
  // Example: telemetry.captureException(error, { extra: errorInfo });
}

/**
 * Props for the ErrorBoundary component.
 */
interface Props {
  children: React.ReactNode;
}

/**
 * State for the ErrorBoundary component.
 */
interface State {
  hasError: boolean;
}

/**
 * A React Error Boundary component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToTelemetry(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
