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
exports.MaestroErrorBoundary = void 0;
exports.withMaestroErrorBoundary = withMaestroErrorBoundary;
exports.useMaestroErrorReporting = useMaestroErrorReporting;
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
class MaestroErrorBoundary extends react_1.Component {
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
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Maestro Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
        // Report to monitoring service
        this.reportError(error, errorInfo);
    }
    componentWillUnmount() {
        // Clear any pending retry timeouts
        this.retryTimeouts.forEach(clearTimeout);
    }
    reportError = async (error, errorInfo) => {
        try {
            await fetch('/api/maestro/v1/errors/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                    errorInfo,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                }),
            });
        }
        catch (reportError) {
            console.error('Failed to report error:', reportError);
        }
    };
    handleRetry = () => {
        if (this.state.retryCount >= (this.props.maxRetries || 3)) {
            return;
        }
        this.setState({
            isRetrying: true,
            retryCount: this.state.retryCount + 1,
        });
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, this.state.retryCount) * 1000;
        const timeout = setTimeout(() => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                isRetrying: false,
            });
        }, delay);
        this.retryTimeouts.push(timeout);
    };
    copyErrorToClipboard = () => {
        const { error, errorInfo } = this.state;
        const errorText = `
Error: ${error?.name || 'Unknown'} - ${error?.message || 'No message'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();
        navigator.clipboard.writeText(errorText).then(() => {
            // Could show a toast notification here
            console.log('Error details copied to clipboard');
        });
    };
    render() {
        if (this.state.hasError) {
            // Show custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // Default error UI
            return (<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <outline_1.BugAntIcon className="h-8 w-8 text-red-600"/>
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                Something went wrong
              </h1>

              <p className="text-gray-600 mb-6">
                The Maestro interface encountered an unexpected error. Our team
                has been notified and is working on a fix.
              </p>

              {/* Error details (collapsible) */}
              <details className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="text-xs font-mono text-gray-600 space-y-2">
                  <div>
                    <strong>Error:</strong>{' '}
                    {this.state.error?.name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Message:</strong>{' '}
                    {this.state.error?.message || 'No message'}
                  </div>
                  {this.state.error?.stack && (<div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-white rounded border">
                        {this.state.error.stack}
                      </pre>
                    </div>)}
                </div>
              </details>

              {/* Action buttons */}
              <div className="space-y-3">
                {this.props.enableRetry !== false && (<button onClick={this.handleRetry} disabled={this.state.isRetrying ||
                        this.state.retryCount >= (this.props.maxRetries || 3)} className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${this.state.isRetrying ||
                        this.state.retryCount >= (this.props.maxRetries || 3)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {this.state.isRetrying ? (<>
                        <outline_1.ArrowPathIcon className="h-4 w-4 mr-2 animate-spin"/>
                        Retrying... ({this.state.retryCount}/
                        {this.props.maxRetries || 3})
                      </>) : (<>
                        <outline_1.ArrowPathIcon className="h-4 w-4 mr-2"/>
                        Try Again ({this.state.retryCount}/
                        {this.props.maxRetries || 3})
                      </>)}
                  </button>)}

                <button onClick={this.copyErrorToClipboard} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <outline_1.ClipboardDocumentIcon className="h-4 w-4 mr-2"/>
                  Copy Error Details
                </button>

                <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Refresh Page
                </button>

                <a href="/maestro" className="w-full flex items-center justify-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors text-sm">
                  Return to Dashboard
                </a>
              </div>

              {/* Support info */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
                Error ID: {this.state.error?.stack?.slice(0, 8) || 'unknown'}
                <br />
                Time: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
exports.MaestroErrorBoundary = MaestroErrorBoundary;
// Specialized error boundary for specific Maestro components
function withMaestroErrorBoundary(Component, options = {}) {
    return function WrappedComponent(props) {
        return (<MaestroErrorBoundary {...options}>
        <Component {...props}/>
      </MaestroErrorBoundary>);
    };
}
// Hook for programmatic error reporting
function useMaestroErrorReporting() {
    const reportError = react_1.default.useCallback(async (error, context) => {
        try {
            await fetch('/api/maestro/v1/errors/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                    context,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                }),
            });
        }
        catch (reportError) {
            console.error('Failed to report error:', reportError);
        }
    }, []);
    return { reportError };
}
