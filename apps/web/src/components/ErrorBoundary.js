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
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
class ErrorBoundary extends react_1.Component {
    state = {
        hasError: false,
        error: null,
        errorInfo: null,
    };
    static getDerivedStateFromError(error) {
        return { hasError: true, error, errorInfo: null };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
        // Log to monitoring service (e.g. Sentry/OpenTelemetry)
    }
    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };
    handleHome = () => {
        window.location.href = '/';
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <lucide_react_1.AlertTriangle className="h-10 w-10 text-red-600"/>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            We encountered an unexpected error. Our team has been notified.
            Please try refreshing the page.
          </p>

          <div className="flex gap-4">
            <Button_1.Button variant="outline" onClick={this.handleHome}>
              <lucide_react_1.Home className="mr-2 h-4 w-4"/>
              Go Home
            </Button_1.Button>
            <Button_1.Button onClick={this.handleRetry}>
              <lucide_react_1.RefreshCcw className="mr-2 h-4 w-4"/>
              Reload Page
            </Button_1.Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (<div className="mt-8 max-h-64 w-full max-w-2xl overflow-auto rounded-md bg-slate-950 p-4 text-left font-mono text-xs text-slate-50">
              <p className="font-bold text-red-400">{this.state.error.toString()}</p>
              <pre className="mt-2">{this.state.errorInfo?.componentStack}</pre>
            </div>)}
        </div>);
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
