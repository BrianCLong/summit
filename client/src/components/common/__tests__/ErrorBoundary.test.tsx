/* eslint-disable @typescript-eslint/no-explicit-any -- jest-dom matchers require type assertions */
import React, { useCallback, useState } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
// @ts-ignore
import ErrorBoundary from '../ErrorBoundary';
import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';

const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

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
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    renderWithTheme(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );

    (expect(screen.getByText('safe child')) as any).toBeInTheDocument();
  });

  it('renders the default fallback when an error is thrown', () => {
    renderWithTheme(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    (expect(screen.getByText('Something went wrong')) as any).toBeInTheDocument();
    (expect(screen.getByText(/Try again/i)) as any).toBeInTheDocument();
  });

  it('supports custom fallback renderers', () => {
    renderWithTheme(
      <ErrorBoundary
        fallback={(error) => <div>Custom fallback: {error?.message}</div>}
      >
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    (expect(
      screen.getByText('Custom fallback: Boom'),
    ) as any).toBeInTheDocument();
  });

  it('invokes onError when errors are captured', () => {
    const onError = jest.fn();

    renderWithTheme(
      <ErrorBoundary onError={onError}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [errorArg, errorInfo] = (onError as any).mock.calls[0];
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

    renderWithTheme(<Harness />);

    (expect(screen.queryByText('safe child')) as any).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('reset-boundary'));
    });

    (expect(screen.getByText('safe child')) as any).toBeInTheDocument();
    (expect(screen.getByText('reset-called')) as any).toBeInTheDocument();
  });

  it('resets automatically when resetKeys change', async () => {
    function Harness({ boundaryKey }: { boundaryKey: string }) {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <>
          <ErrorBoundary resetKeys={[boundaryKey]}>
            <Thrower shouldThrow={shouldThrow} />
          </ErrorBoundary>
          <button type="button" onClick={() => setShouldThrow(false)}>
            make-safe
          </button>
        </>
      );
    }

    const { rerender } = renderWithTheme(<Harness boundaryKey="first" />);

    (expect(screen.queryByText('safe child')) as any).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('make-safe'));

    rerender(<ThemeProvider theme={theme}><Harness boundaryKey="second" /></ThemeProvider>);

    await waitFor(() => {
      (expect(screen.getByText('safe child')) as any).toBeInTheDocument();
    });
  });

});
