// client/src/components/ErrorBoundary.tsx
import React from 'react';

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

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

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
