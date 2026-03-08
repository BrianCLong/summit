"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEnhancedErrorBoundaries = exports.FeatureFlaggedErrorBoundary = void 0;
const react_1 = __importDefault(require("react"));
const ErrorBoundary_1 = require("./ErrorBoundary");
const FeatureFlagContext_1 = require("@/contexts/FeatureFlagContext");
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
const FeatureFlaggedErrorBoundary = ({ children, flagKey = 'error_boundaries.retry_enabled', fallback, onError, context, boundaryName, }) => {
    const { isEnabled, getVariant } = (0, FeatureFlagContext_1.useFeatureFlags)();
    // Check feature flags
    const retryEnabled = isEnabled(flagKey, false);
    const maxRetries = getVariant('error_boundaries.max_retries', 3);
    return (<ErrorBoundary_1.ErrorBoundary enableRetry={retryEnabled} maxRetries={maxRetries} retryDelay={1000} severity="high" fallback={fallback} onError={onError} context={{
            ...context,
            featureFlagsEnabled: {
                retry: retryEnabled,
                maxRetries,
            },
        }} boundaryName={boundaryName}>
      {children}
    </ErrorBoundary_1.ErrorBoundary>);
};
exports.FeatureFlaggedErrorBoundary = FeatureFlaggedErrorBoundary;
/**
 * Hook to check if enhanced error boundaries are enabled for a specific context.
 * Useful for conditional rendering or feature detection.
 */
const useEnhancedErrorBoundaries = () => {
    const { isEnabled, getVariant } = (0, FeatureFlagContext_1.useFeatureFlags)();
    return {
        retryEnabled: isEnabled('error_boundaries.retry_enabled', false),
        maxRetries: getVariant('error_boundaries.max_retries', 3),
        telemetryEnhanced: isEnabled('error_boundaries.telemetry_enhanced', true),
    };
};
exports.useEnhancedErrorBoundaries = useEnhancedErrorBoundaries;
