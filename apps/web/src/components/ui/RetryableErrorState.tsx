import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './Card'

export interface RetryableErrorStateProps {
  error?: Error | string
  onRetry?: () => void
  onNavigateHome?: () => void
  title?: string
  description?: string
  showDetails?: boolean
  className?: string
}

/**
 * RetryableErrorState - A standardized error UI component with retry functionality
 *
 * Provides:
 * - Clear error messaging
 * - Retry action
 * - Optional navigation fallback
 * - Accessibility: role="alert", aria-live, focus management
 */
export function RetryableErrorState({
  error,
  onRetry,
  onNavigateHome,
  title = 'Unable to load data',
  description = 'An error occurred while loading this content. Please try again.',
  showDetails = false,
  className,
}: RetryableErrorStateProps) {
  const errorMessage =
    typeof error === 'string' ? error : error?.message || 'Unknown error'

  return (
    <div
      className={`flex min-h-[300px] w-full items-center justify-center p-6 ${className || ''}`}
      role="alert"
      aria-live="assertive"
    >
      <Card className="max-w-md w-full border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </CardHeader>

        {showDetails && error && (
          <CardContent>
            <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto border">
              <p className="text-destructive font-semibold">{errorMessage}</p>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex gap-3 justify-end">
          {onNavigateHome && (
            <Button variant="outline" onClick={onNavigateHome}>
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Home
            </Button>
          )}
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
