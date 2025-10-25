import { createRequire } from 'node:module';
import { Component, createElement } from 'react';
import type { ErrorInfo, ReactElement, ReactNode } from 'react';
import type { ErrorBoundaryOptions } from './types';

interface BoundaryProps {
  fallback: ({ error, resetError }: { error: unknown; resetError: () => void }) => ReactElement;
  onError?: (error: unknown, componentStack?: string) => void;
  onReset?: () => void;
}

type ErrorBoundaryComponent = (props: BoundaryProps & { children: ReactNode }) => ReactElement;
type BoundaryFactory = () => ErrorBoundaryComponent;

const require = createRequire(import.meta.url);

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown error');
}

// The fallback boundary is only used when the Sentry React integration is unavailable.
// This is difficult to simulate within our Node-based test harness, so exclude from coverage.
/* c8 ignore start */
export function createFallbackBoundary(): ErrorBoundaryComponent {
  interface FallbackState {
    hasError: boolean;
    error: unknown;
  }

  class FallbackBoundary
    extends Component<BoundaryProps & { children: ReactNode }, FallbackState>
  {
    public override state: FallbackState = { hasError: false, error: null };

    public static getDerivedStateFromError(error: unknown): FallbackState {
      return { hasError: true, error };
    }

    public override componentDidCatch(error: unknown, info: ErrorInfo): void {
      this.props.onError?.(normaliseError(error), info.componentStack ?? '');
    }

    private readonly resetBoundary = (): void => {
      this.setState({ hasError: false, error: null });
      this.props.onReset?.();
    };

    public override render(): ReactNode {
      if (this.state.hasError) {
        return this.props.fallback({
          error: normaliseError(this.state.error),
          resetError: this.resetBoundary
        });
      }

      return this.props.children;
    }
  }

  return function FallbackBoundaryWrapper(props: BoundaryProps & { children: ReactNode }) {
    return createElement(FallbackBoundary, props);
  };
}
/* c8 ignore end */

function loadDefaultBoundary(): ErrorBoundaryComponent {
  try {
    const module = require('@sentry/react') as { ErrorBoundary?: ErrorBoundaryComponent };
    if (module && typeof module.ErrorBoundary === 'function') {
      return module.ErrorBoundary;
    }
  } catch {
    // ignore - fallback to custom boundary
  }
  return createFallbackBoundary();
}

export function createErrorBoundary(
  options: ErrorBoundaryOptions,
  boundaryFactory: BoundaryFactory = loadDefaultBoundary
): (props: { children: ReactNode }) => ReactElement {
  const { fallback, onError, onReset } = options;
  const boundaryProps: BoundaryProps = {
    fallback: ({ error, resetError }) => fallback({ error: normaliseError(error), resetError }),
    onError: (error, componentStack) => {
      onError?.(normaliseError(error), componentStack ?? '');
    },
    onReset: () => {
      onReset?.();
    }
  };

  return function SummitErrorBoundary({ children }: { children: ReactNode }): ReactElement {
    const Boundary = boundaryFactory();
    return <Boundary {...boundaryProps}>{children}</Boundary>;
  };
}
