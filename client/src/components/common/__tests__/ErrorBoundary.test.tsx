import React, { useCallback, useState } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { vi } from 'vitest';

type ThrowerProps = { shouldThrow?: boolean };

function Thrower({ shouldThrow = false }: ThrowerProps) {
  if (shouldThrow) {
    throw new Error('Boom');
  }

  return <div>safe child</div>;
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('safe child')).toBeInTheDocument();
  });

  it('renders the default fallback when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Try again/i)).toBeInTheDocument();
  });

  it('supports custom fallback renderers', () => {
    render(
      <ErrorBoundary
        fallback={(error) => <div>Custom fallback: {error?.message}</div>}
      >
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText('Custom fallback: Boom'),
    ).toBeInTheDocument();
  });

  it('invokes onError when errors are captured', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [errorArg, errorInfo] = onError.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorInfo.componentStack).toContain('Thrower');
  });

  it('can be reset via the reset callback', async () => {
    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true);
      const [resetCalled, setResetCalled] = useState(false);

      const handleReset = useCallback(() => {
        setShouldThrow(false);
        setResetCalled(true);
      }, []);

      return (
        <ErrorBoundary
          fallback={(_error, _info, reset) => (
            <button type="button" onClick={() => reset?.()}>
              reset-boundary
            </button>
          )}
          onReset={handleReset}
        >
          <Thrower shouldThrow={shouldThrow} />
          {resetCalled && <span>reset-called</span>}
        </ErrorBoundary>
      );
    }

    render(<Harness />);

    expect(screen.queryByText('safe child')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('reset-boundary'));
    });

    expect(screen.getByText('safe child')).toBeInTheDocument();
    expect(screen.getByText('reset-called')).toBeInTheDocument();
  });

  it('resets automatically when resetKeys change', () => {
    function Harness({ boundaryKey }: { boundaryKey: string }) {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <ErrorBoundary resetKeys={[boundaryKey]}>
          <Thrower shouldThrow={shouldThrow} />
          <button type="button" onClick={() => setShouldThrow(false)}>
            make-safe
          </button>
        </ErrorBoundary>
      );
    }

    const { rerender } = render(<Harness boundaryKey="first" />);

    expect(screen.queryByText('safe child')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('make-safe'));

    rerender(<Harness boundaryKey="second" />);

    expect(screen.getByText('safe child')).toBeInTheDocument();
  });
});
