import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { AlertTriangle, RefreshCw, Home, Loader2, ExternalLink, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useResilience } from '@/contexts/ResilienceContext';
import { logErrorEvidence } from '@/lib/evidenceLogger';

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

  // Safely attempt to use resilience context, fallback to default if missing
  let resilienceContext;
  try {
    resilienceContext = useResilience();
  } catch (e) {
    // Context missing, use defaults
    resilienceContext = {
      policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
      agenticRecoveryEnabled: false
    };
  }
  const { agenticRecoveryEnabled, policy } = resilienceContext;

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);

  useEffect(() => {
    // Focus the heading for accessibility
    if (headingRef.current) {
      headingRef.current.focus();
    }

    // Log evidence if enabled
    if (error && policy.reportErrors) {
      logErrorEvidence(error);
    }
  }, [error, policy.reportErrors]);

  const handleHome = () => {
    navigate('/');
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
  };

  const handleAgentDiagnosis = () => {
    setIsDiagnosing(true);
    // Stub for Agentic Recovery
    setTimeout(() => {
      setIsDiagnosing(false);
      setDiagnosis("Copilot Diagnosis: This appears to be a transient network failure. A retry is recommended.");
    }, 1500);
  };

  const effectiveMaxRetries = maxRetries || policy.maxRetries;
  const canRetry = showRetry && retryCount < effectiveMaxRetries;
  const retryButtonText = isRetrying
    ? `Retrying (${retryCount}/${effectiveMaxRetries})...`
    : canRetry
    ? `Try Again (${retryCount}/${effectiveMaxRetries})`
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

          {diagnosis && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-1">
                <Bot className="h-4 w-4" />
                <span>Copilot Insight</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-200">
                {diagnosis}
              </p>
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
          <div className="flex gap-3 w-full justify-end flex-wrap">
             {agenticRecoveryEnabled && !diagnosis && (
              <Button
                variant="secondary"
                onClick={handleAgentDiagnosis}
                disabled={isDiagnosing}
              >
                {isDiagnosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                {isDiagnosing ? 'Analyzing...' : 'Ask Copilot'}
              </Button>
            )}

            {showHomeButton && (
              <Button variant="outline" onClick={handleHome}>
                <Home className="mr-2 h-4 w-4" />
                Workspace
              </Button>
            )}

            {(showRetry || (!showRetry && resetErrorBoundary)) && resetErrorBoundary && (
               <Button
                onClick={resetErrorBoundary}
                variant="default"
                disabled={!canRetry && showRetry && !isRetrying}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {retryButtonText}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {showRetry ? retryButtonText : 'Try Again'}
                  </>
                )}
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
