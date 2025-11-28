import React from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type FallbackRenderer = (
  error?: Error,
  errorInfo?: React.ErrorInfo,
  resetErrorBoundary?: () => void,
) => React.ReactNode;

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode | FallbackRenderer;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<unknown>;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

function arraysAreEqual(first?: Array<unknown>, second?: Array<unknown>) {
  if (first === second) return true;
  if (!first || !second || first.length !== second.length) return false;
  return first.every((value, index) => Object.is(value, second[index]));
}

function DefaultFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
}: {
  error?: Error;
  resetErrorBoundary?: () => void;
  title?: string;
}) {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }} role="alert" aria-live="assertive">
        <Stack spacing={2}>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>

          <Alert severity="error" sx={{ alignItems: 'flex-start' }}>
            <Stack spacing={1}>
              <Typography variant="body1">
                Our team has been notified. You can try to reload the app to
                continue.
              </Typography>
              {error?.message ? (
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    p: 1.5,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    m: 0,
                  }}
                >
                  {error.message}
                </Box>
              ) : null}
            </Stack>
          </Alert>

          <Stack direction="row" spacing={2}>
            {resetErrorBoundary ? (
              <Button
                variant="contained"
                color="primary"
                onClick={resetErrorBoundary}
              >
                Try again
              </Button>
            ) : null}
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => window.location.reload()}
            >
              Reload app
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary captured an error', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      !arraysAreEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return (this.props.fallback as FallbackRenderer)(
          this.state.error,
          this.state.errorInfo,
          this.resetErrorBoundary,
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export { DefaultFallback as ErrorFallback };
