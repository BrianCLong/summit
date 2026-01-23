import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

interface FeatureFlaggedErrorBoundaryProps {
  children: React.ReactNode;
  flagKey?: string;
  fallback?: React.ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: Record<string, any>;
  boundaryName?: string;
}

/**
 * Feature-flag-aware error boundary wrapper that enables gradual rollout
 * of enhanced error boundary features.
 *
 * When the feature flag is enabled, uses the enhanced ErrorBoundary with
 * retry logic and advanced telemetry. When disabled, falls back to basic
 * error boundary behavior.
 *
 * Feature flags:
 * - `error_boundaries.retry_enabled`: Enable automatic retry with exponential backoff
 * - `error_boundaries.max_retries`: Number of retry attempts (default: 3)
 * - `error_boundaries.telemetry_enhanced`: Enable enhanced telemetry with fingerprinting
 *
 * Usage:
 * ```tsx
 * <FeatureFlaggedErrorBoundary
 *   boundaryName="dashboard_command_center"
 *   flagKey="error_boundaries.retry_enabled"
 * >
 *   <CommandCenterDashboard />
 * </FeatureFlaggedErrorBoundary>
 * ```
 */
export const FeatureFlaggedErrorBoundary: React.FC<FeatureFlaggedErrorBoundaryProps> = ({
  children,
  flagKey = 'error_boundaries.retry_enabled',
  fallback,
  onError,
  context,
  boundaryName,
}) => {
  const { isEnabled, getVariant } = useFeatureFlags();

  // Check feature flags
  const retryEnabled = isEnabled(flagKey, false);
  const maxRetries = getVariant<number>('error_boundaries.max_retries', 3);

  return (
    <ErrorBoundary
      enableRetry={retryEnabled}
      maxRetries={maxRetries}
      retryDelay={1000}
      severity="high"
      fallback={fallback}
      onError={onError}
      context={{
        ...context,
        featureFlagsEnabled: {
          retry: retryEnabled,
          maxRetries,
        },
      }}
      boundaryName={boundaryName}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Hook to check if enhanced error boundaries are enabled for a specific context.
 * Useful for conditional rendering or feature detection.
 */
export const useEnhancedErrorBoundaries = () => {
  const { isEnabled, getVariant } = useFeatureFlags();

  return {
    retryEnabled: isEnabled('error_boundaries.retry_enabled', false),
    maxRetries: getVariant<number>('error_boundaries.max_retries', 3),
    telemetryEnhanced: isEnabled('error_boundaries.telemetry_enhanced', true),
  };
};
