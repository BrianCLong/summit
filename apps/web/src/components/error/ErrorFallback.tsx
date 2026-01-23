import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { AlertTriangle, RefreshCw, Home, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  showRetry?: boolean;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  errorCode?: string;
  supportLink?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  showHomeButton = true,
  showRetry = false,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  errorCode,
  supportLink = '/help',
}) => {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Focus the heading for accessibility when the error boundary mounts
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  const handleHome = () => {
    navigate('/');
    // Optional: reset boundary if provided, though navigating might be enough
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
  };

  const canRetry = showRetry && retryCount < maxRetries;
  const retryButtonText = isRetrying
    ? `Retrying (${retryCount}/${maxRetries})...`
    : canRetry
    ? `Try Again (${retryCount}/${maxRetries})`
    : 'Retry limit reached';

  return (
    <div
      className="flex min-h-[400px] w-full items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
    >
      <Card className="max-w-md w-full shadow-lg border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            <CardTitle
              className="text-xl outline-none"
              tabIndex={-1}
              ref={headingRef}
            >
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && import.meta.env.DEV && (
            <div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono border">
              <p className="font-semibold mb-1 text-destructive">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="opacity-70">{error.stack}</pre>
              )}
            </div>
          )}
          {!import.meta.env.DEV && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Our team has been notified of this issue.
              </p>
              {errorCode && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error code: <span className="font-semibold">{errorCode}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="flex gap-3 w-full justify-end">
            {showHomeButton && (
              <Button variant="outline" onClick={handleHome}>
                <Home className="mr-2 h-4 w-4" />
                Back to Workspace
              </Button>
            )}
            {showRetry && resetErrorBoundary && (
              <Button
                onClick={resetErrorBoundary}
                variant="default"
                disabled={!canRetry || isRetrying}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {retryButtonText}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {retryButtonText}
                  </>
                )}
              </Button>
            )}
            {!showRetry && resetErrorBoundary && (
              <Button onClick={resetErrorBoundary} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
          {supportLink && (
            <a
              href={supportLink}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Need help? Contact support
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
