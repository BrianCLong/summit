import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // TODO: wire to your telemetry
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <pre className="mt-3 text-sm whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}