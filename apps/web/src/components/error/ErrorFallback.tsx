import React from 'react';
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

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  showHomeButton = true,
}) => {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
    // Optional: reset boundary if provided, though navigating might be enough
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
  };

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle className="text-xl">{title}</CardTitle>
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
            <p className="text-sm text-muted-foreground">
              Our team has been notified of this issue.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-3 justify-end">
          {showHomeButton && (
            <Button variant="outline" onClick={handleHome}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
          {resetErrorBoundary && (
            <Button onClick={resetErrorBoundary} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
