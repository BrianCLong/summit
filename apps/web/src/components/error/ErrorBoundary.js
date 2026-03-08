"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
const react_1 = __importStar(require("react"));
const metrics_1 = require("@/telemetry/metrics");
const ErrorFallback_1 = require("./ErrorFallback");
/**
 * A reusable Error Boundary component that catches JavaScript errors in its child component tree.
 * It logs errors to the telemetry service and displays a fallback UI.
 *
 * Features:
 * - Telemetry integration with error fingerprinting and categorization
 * - Optional retry logic with exponential backoff
 * - Feature flag integration for gradual rollout
 * - Custom fallback UI support
 * - Named boundaries for better observability
 */
class ErrorBoundary extends react_1.Component {
    retryTimeouts = [];
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            isRetrying: false,
        };
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // Store errorInfo for reporting
        this.setState({ errorInfo });
        // Report error to telemetry service with additional context
        const context = {
            ...this.props.context,
            boundaryName: this.props.boundaryName,
            retryCount: this.state.retryCount,
            route: window.location.pathname,
        };
        (0, metrics_1.reportError)(error, errorInfo, this.props.severity || 'high', context);
        // Call optional onError prop
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    componentWillUnmount() {
        // Clear any pending retry timeouts
        this.retryTimeouts.forEach(clearTimeout);
    }
    resetErrorBoundary = () => {
        const { enableRetry = false, maxRetries = 3, retryDelay = 1000 } = this.props;
        const { retryCount } = this.state;
        // Check if retry is enabled and we haven't exceeded max retries
        if (enableRetry && retryCount < maxRetries) {
            this.setState({ isRetrying: true });
            // Exponential backoff: retryDelay * 2^retryCount (e.g., 1s, 2s, 4s)
            const delay = retryDelay * Math.pow(2, retryCount);
            const timeout = setTimeout(() => {
                // Call optional onReset prop (e.g., to reset state in parent)
                if (this.props.onReset) {
                    this.props.onReset();
                }
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    retryCount: retryCount + 1,
                    isRetrying: false,
                });
            }, delay);
            this.retryTimeouts.push(timeout);
        }
        else {
            // No retry or max retries exceeded - just reset
            if (this.props.onReset) {
                this.props.onReset();
            }
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                retryCount: 0,
                isRetrying: false,
            });
        }
    };
    render() {
        const { hasError, error, isRetrying, retryCount } = this.state;
        const { enableRetry = false, maxRetries = 3 } = this.props;
        if (hasError && error) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                if (typeof this.props.fallback === 'function') {
                    return this.props.fallback({
                        error,
                        resetErrorBoundary: this.resetErrorBoundary,
                        retryCount,
                        isRetrying,
                        maxRetries,
                    });
                }
                return this.props.fallback;
            }
            // Default fallback with retry support
            return (<ErrorFallback_1.ErrorFallback error={error} resetErrorBoundary={this.resetErrorBoundary} showRetry={enableRetry} isRetrying={isRetrying} retryCount={retryCount} maxRetries={maxRetries}/>);
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
