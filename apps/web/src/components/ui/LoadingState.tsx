import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Size variant for the spinner
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional className for styling
   */
  className?: string;
  /**
   * Whether to show in full-page mode (centered in viewport)
   */
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

/**
 * Standardized loading state component with consistent styling and accessibility
 */
export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
  fullPage = false,
}: LoadingStateProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullPage ? 'min-h-[400px]' : 'p-8',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Loader2
        className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
