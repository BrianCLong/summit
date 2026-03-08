"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
class ErrorBoundary extends react_1.default.Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        const payload = JSON.stringify({
            event: 'ui_error_boundary',
            labels: {
                component: this.props.componentName || 'unknown',
                message: error.message,
                tenantId: localStorage.getItem('tenantId') || 'unknown',
                // Truncate stack if too long
                stack: errorInfo.componentStack?.substring(0, 1000),
            },
        });
        try {
            const url = '/monitoring/telemetry/events';
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            }
            else {
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Attempt to extract tenant ID if available in localStorage
                        'x-tenant-id': localStorage.getItem('tenantId') || 'unknown',
                    },
                    body: payload,
                    keepalive: true,
                    mode: 'cors',
                }).catch((e) => console.error('Failed to report error to backend:', e));
            }
        }
        catch (telemetryError) {
            console.error('Failed to initiate telemetry send:', telemetryError);
        }
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback)
                return this.props.fallback;
            return (<div className="p-6 border border-red-200 rounded-lg bg-red-50 text-red-900 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">
            Something went wrong in {this.props.componentName || 'this component'}.
          </h3>
          <p className="mb-4 text-sm opacity-80">
            {this.state.error?.message}
          </p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors text-sm font-medium">
            Try Again
          </button>
        </div>);
        }
        return this.props.children;
    }
}
exports.default = ErrorBoundary;
