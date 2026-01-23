import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Database, RefreshCw, Loader2 } from 'lucide-react';

interface DataFetchErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  retryCount: number;
  isRetrying: boolean;
  maxRetries: number;
  dataSourceName?: string;
}

const DataFetchErrorFallback: React.FC<DataFetchErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  retryCount,
  isRetrying,
  maxRetries,
  dataSourceName = 'data source',
}) => {
  const canRetry = retryCount < maxRetries;

  return (
    <div className="flex min-h-[300px] w-full items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-md border-yellow-200 dark:border-yellow-900">
        <CardHeader>
          <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500 mb-2">
            <Database className="h-6 w-6" aria-hidden="true" />
            <CardTitle className="text-xl">Data Loading Failed</CardTitle>
          </div>
          <CardDescription className="text-base">
            We couldn't load data from {dataSourceName}. This might be a temporary network
            issue or the service may be unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Wait a moment and try again</li>
              <li>Check your network connection</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
          {import.meta.env.DEV && (
            <div className="bg-muted p-3 rounded-md text-xs font-mono border">
              <p className="font-semibold mb-1 text-destructive">
                {error.name}: {error.message}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3 justify-end">
          <Button
            onClick={resetErrorBoundary}
            variant="default"
            disabled={!canRetry || isRetrying}
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying ({retryCount}/{maxRetries})...
              </>
            ) : canRetry ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry ({retryCount}/{maxRetries})
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry limit reached
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

interface DataFetchErrorBoundaryProps {
  children: React.ReactNode;
  dataSourceName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: Record<string, any>;
}

/**
 * Specialized error boundary for data-fetching components like dashboards,
 * analytics views, and graph visualizations.
 *
 * Features:
 * - Automatic retry with exponential backoff (up to 3 attempts)
 * - User-friendly fallback UI explaining data loading failures
 * - Telemetry integration with 'data_fetch' category
 * - Medium severity by default (non-critical failures)
 *
 * Usage:
 * ```tsx
 * <DataFetchErrorBoundary dataSourceName="Command Center">
 *   <CommandCenterDashboard />
 * </DataFetchErrorBoundary>
 * ```
 */
export const DataFetchErrorBoundary: React.FC<DataFetchErrorBoundaryProps> = ({
  children,
  dataSourceName,
  onError,
  context,
}) => {
  return (
    <ErrorBoundary
      enableRetry={true}
      maxRetries={3}
      retryDelay={1000}
      severity="medium"
      onError={onError}
      context={{
        ...context,
        dataSourceName,
        boundaryType: 'data_fetch',
      }}
      fallback={(props) => (
        <DataFetchErrorFallback {...props} dataSourceName={dataSourceName} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
