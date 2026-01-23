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
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MutationErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  operationName?: string;
}

const MutationErrorFallback: React.FC<MutationErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  operationName = 'operation',
}) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            <CardTitle className="text-xl">Operation Failed</CardTitle>
          </div>
          <CardDescription className="text-base">
            The {operationName} could not be completed. Your changes may not have been
            saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Important: Please verify your data
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Before retrying, check if your changes were partially saved to avoid
              duplication or data loss.
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Possible causes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Network connection issue</li>
              <li>Server validation error</li>
              <li>Permission or authorization error</li>
              <li>Conflicting changes from another user</li>
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
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Back to Safety
          </Button>
          <Button onClick={resetErrorBoundary} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

interface MutationErrorBoundaryProps {
  children: React.ReactNode;
  operationName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: Record<string, any>;
}

/**
 * Specialized error boundary for critical mutation operations like admin panels,
 * bulk actions, and data modification interfaces.
 *
 * Features:
 * - NO automatic retry to prevent duplicate mutations
 * - Clear warning about data consistency
 * - Telemetry integration with 'mutation' category
 * - High severity by default (critical operations)
 * - Safe escape route back to main workspace
 *
 * Usage:
 * ```tsx
 * <MutationErrorBoundary operationName="bulk user update">
 *   <BulkUserEditor />
 * </MutationErrorBoundary>
 * ```
 */
export const MutationErrorBoundary: React.FC<MutationErrorBoundaryProps> = ({
  children,
  operationName,
  onError,
  context,
}) => {
  return (
    <ErrorBoundary
      enableRetry={false} // No auto-retry for mutations to prevent duplicates
      severity="high"
      onError={onError}
      context={{
        ...context,
        operationName,
        boundaryType: 'mutation',
      }}
      fallback={(props) => (
        <MutationErrorFallback {...props} operationName={operationName} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
