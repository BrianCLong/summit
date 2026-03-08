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
exports.ErrorFallback = void 0;
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const ResilienceContext_1 = require("@/contexts/ResilienceContext");
const evidenceLogger_1 = require("@/lib/evidenceLogger");
const ErrorFallback = ({ error, resetErrorBoundary, title = 'Something went wrong', description = 'An unexpected error occurred. Please try again.', showHomeButton = true, showRetry = false, isRetrying = false, retryCount = 0, maxRetries = 3, errorCode, supportLink = '/help', }) => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const headingRef = (0, react_1.useRef)(null);
    // Safely attempt to use resilience context, fallback to default if missing
    let resilienceContext;
    try {
        resilienceContext = (0, ResilienceContext_1.useResilience)();
    }
    catch (e) {
        // Context missing, use defaults
        resilienceContext = {
            policy: { maxRetries: 3, retryBackoffMs: 2000, fallbackStrategy: 'simple', reportErrors: true },
            agenticRecoveryEnabled: false
        };
    }
    const { agenticRecoveryEnabled, policy } = resilienceContext;
    const [isDiagnosing, setIsDiagnosing] = (0, react_1.useState)(false);
    const [diagnosis, setDiagnosis] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Focus the heading for accessibility
        if (headingRef.current) {
            headingRef.current.focus();
        }
        // Log evidence if enabled
        if (error && policy.reportErrors) {
            (0, evidenceLogger_1.logErrorEvidence)(error);
        }
    }, [error, policy.reportErrors]);
    const handleHome = () => {
        navigate('/');
        if (resetErrorBoundary) {
            resetErrorBoundary();
        }
    };
    const handleAgentDiagnosis = () => {
        setIsDiagnosing(true);
        // Stub for Agentic Recovery
        setTimeout(() => {
            setIsDiagnosing(false);
            setDiagnosis("Copilot Diagnosis: This appears to be a transient network failure. A retry is recommended.");
        }, 1500);
    };
    const effectiveMaxRetries = maxRetries || policy.maxRetries;
    const canRetry = showRetry && retryCount < effectiveMaxRetries;
    const retryButtonText = isRetrying
        ? `Retrying (${retryCount}/${effectiveMaxRetries})...`
        : canRetry
            ? `Try Again (${retryCount}/${effectiveMaxRetries})`
            : 'Retry limit reached';
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-4" role="alert" aria-live="assertive">
      <Card_1.Card className="max-w-md w-full shadow-lg border-destructive/20">
        <Card_1.CardHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <lucide_react_1.AlertTriangle className="h-6 w-6" aria-hidden="true"/>
            <Card_1.CardTitle className="text-xl outline-none" tabIndex={-1} ref={headingRef}>
              {title}
            </Card_1.CardTitle>
          </div>
          <Card_1.CardDescription className="text-base">{description}</Card_1.CardDescription>
        </Card_1.CardHeader>
        <Card_1.CardContent className="space-y-4">
          {error && import.meta.env.DEV && (<div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono border">
              <p className="font-semibold mb-1 text-destructive">
                {error.name}: {error.message}
              </p>
              {error.stack && (<pre className="opacity-70">{error.stack}</pre>)}
            </div>)}

          {diagnosis && (<div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold mb-1">
                <lucide_react_1.Bot className="h-4 w-4"/>
                <span>Copilot Insight</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-200">
                {diagnosis}
              </p>
            </div>)}

          {!import.meta.env.DEV && (<div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Our team has been notified of this issue.
              </p>
              {errorCode && (<p className="text-xs text-muted-foreground font-mono">
                  Error code: <span className="font-semibold">{errorCode}</span>
                </p>)}
            </div>)}
        </Card_1.CardContent>
        <Card_1.CardFooter className="flex flex-col gap-3">
          <div className="flex gap-3 w-full justify-end flex-wrap">
             {agenticRecoveryEnabled && !diagnosis && (<Button_1.Button variant="secondary" onClick={handleAgentDiagnosis} disabled={isDiagnosing}>
                {isDiagnosing ? <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <lucide_react_1.Bot className="mr-2 h-4 w-4"/>}
                {isDiagnosing ? 'Analyzing...' : 'Ask Copilot'}
              </Button_1.Button>)}

            {showHomeButton && (<Button_1.Button variant="outline" onClick={handleHome}>
                <lucide_react_1.Home className="mr-2 h-4 w-4"/>
                Workspace
              </Button_1.Button>)}

            {(showRetry || (!showRetry && resetErrorBoundary)) && resetErrorBoundary && (<Button_1.Button onClick={resetErrorBoundary} variant="default" disabled={!canRetry && showRetry && !isRetrying}>
                {isRetrying ? (<>
                    <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    {retryButtonText}
                  </>) : (<>
                    <lucide_react_1.RefreshCw className="mr-2 h-4 w-4"/>
                    {showRetry ? retryButtonText : 'Try Again'}
                  </>)}
              </Button_1.Button>)}
          </div>
          {supportLink && (<a href={supportLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Need help? Contact support
              <lucide_react_1.ExternalLink className="h-3 w-3"/>
            </a>)}
        </Card_1.CardFooter>
      </Card_1.Card>
    </div>);
};
exports.ErrorFallback = ErrorFallback;
