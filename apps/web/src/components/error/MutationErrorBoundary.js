"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationErrorBoundary = void 0;
const react_1 = __importDefault(require("react"));
const ErrorBoundary_1 = require("./ErrorBoundary");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const MutationErrorFallback = ({ error, resetErrorBoundary, operationName = 'operation', }) => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleGoHome = () => {
        navigate('/');
    };
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-4">
      <Card_1.Card className="max-w-md w-full shadow-lg border-destructive/50">
        <Card_1.CardHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <lucide_react_1.AlertTriangle className="h-6 w-6" aria-hidden="true"/>
            <Card_1.CardTitle className="text-xl">Operation Failed</Card_1.CardTitle>
          </div>
          <Card_1.CardDescription className="text-base">
            The {operationName} could not be completed. Your changes may not have been
            saved.
          </Card_1.CardDescription>
        </Card_1.CardHeader>
        <Card_1.CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Important: Please verify your data
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Before retrying, check if your changes were partially saved to avoid
              duplication or data loss.
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Possible causes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Network connection issue</li>
              <li>Server validation error</li>
              <li>Permission or authorization error</li>
              <li>Conflicting changes from another user</li>
            </ul>
          </div>
          {import.meta.env.DEV && (<div className="bg-muted p-3 rounded-md text-xs font-mono border">
              <p className="font-semibold mb-1 text-destructive">
                {error.name}: {error.message}
              </p>
            </div>)}
        </Card_1.CardContent>
        <Card_1.CardFooter className="flex gap-3 justify-end">
          <Button_1.Button variant="outline" onClick={handleGoHome}>
            <lucide_react_1.Home className="mr-2 h-4 w-4"/>
            Back to Safety
          </Button_1.Button>
          <Button_1.Button onClick={resetErrorBoundary} variant="default">
            <lucide_react_1.RefreshCw className="mr-2 h-4 w-4"/>
            Try Again
          </Button_1.Button>
        </Card_1.CardFooter>
      </Card_1.Card>
    </div>);
};
/**
 * Specialized error boundary for critical mutation operations like admin panels,
 * bulk actions, and data modification interfaces.
 *
 * Features:
 * - NO automatic retry to prevent duplicate mutations
 * - Clear warning about data consistency
 * - Telemetry integration with 'mutation' category
 * - High severity by default (critical operations)
 * - Safe escape route back to main workspace
 *
 * Usage:
 * ```tsx
 * <MutationErrorBoundary operationName="bulk user update">
 *   <BulkUserEditor />
 * </MutationErrorBoundary>
 * ```
 */
const MutationErrorBoundary = ({ children, operationName, onError, context, }) => {
    return (<ErrorBoundary_1.ErrorBoundary enableRetry={false} // No auto-retry for mutations to prevent duplicates
     severity="high" onError={onError} context={{
            ...context,
            operationName,
            boundaryType: 'mutation',
        }} fallback={(props) => (<MutationErrorFallback {...props} operationName={operationName}/>)}>
      {children}
    </ErrorBoundary_1.ErrorBoundary>);
};
exports.MutationErrorBoundary = MutationErrorBoundary;
