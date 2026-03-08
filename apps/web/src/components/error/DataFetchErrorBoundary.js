"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFetchErrorBoundary = void 0;
const react_1 = __importDefault(require("react"));
const ErrorBoundary_1 = require("./ErrorBoundary");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const lucide_react_1 = require("lucide-react");
const DataFetchErrorFallback = ({ error, resetErrorBoundary, retryCount, isRetrying = false, maxRetries = 3, dataSourceName = 'data source', }) => {
    const canRetry = retryCount < maxRetries;
    return (<div className="flex min-h-[300px] w-full items-center justify-center p-4">
      <Card_1.Card className="max-w-md w-full shadow-md border-yellow-200 dark:border-yellow-900">
        <Card_1.CardHeader>
          <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500 mb-2">
            <lucide_react_1.Database className="h-6 w-6" aria-hidden="true"/>
            <Card_1.CardTitle className="text-xl">Data Loading Failed</Card_1.CardTitle>
          </div>
          <Card_1.CardDescription className="text-base">
            We couldn't load data from {dataSourceName}. This might be a temporary network
            issue or the service may be unavailable.
          </Card_1.CardDescription>
        </Card_1.CardHeader>
        <Card_1.CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Wait a moment and try again</li>
              <li>Check your network connection</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
          {import.meta.env.DEV && (<div className="bg-muted p-3 rounded-md text-xs font-mono border">
              <p className="font-semibold mb-1 text-destructive">
                {error.name}: {error.message}
              </p>
            </div>)}
        </Card_1.CardContent>
        <Card_1.CardFooter className="flex gap-3 justify-end">
          <Button_1.Button onClick={resetErrorBoundary} variant="default" disabled={!canRetry || isRetrying}>
            {isRetrying ? (<>
                <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Retrying ({retryCount}/{maxRetries})...
              </>) : canRetry ? (<>
                <lucide_react_1.RefreshCw className="mr-2 h-4 w-4"/>
                Retry ({retryCount}/{maxRetries})
              </>) : (<>
                <lucide_react_1.RefreshCw className="mr-2 h-4 w-4"/>
                Retry limit reached
              </>)}
          </Button_1.Button>
        </Card_1.CardFooter>
      </Card_1.Card>
    </div>);
};
/**
 * Specialized error boundary for data-fetching components like dashboards,
 * analytics views, and graph visualizations.
 *
 * Features:
 * - Automatic retry with exponential backoff (up to 3 attempts)
 * - User-friendly fallback UI explaining data loading failures
 * - Telemetry integration with 'data_fetch' category
 * - Medium severity by default (non-critical failures)
 *
 * Usage:
 * ```tsx
 * <DataFetchErrorBoundary dataSourceName="Command Center">
 *   <CommandCenterDashboard />
 * </DataFetchErrorBoundary>
 * ```
 */
const DataFetchErrorBoundary = ({ children, dataSourceName, onError, context, }) => {
    return (<ErrorBoundary_1.ErrorBoundary enableRetry={true} maxRetries={3} retryDelay={1000} severity="medium" onError={onError} context={{
            ...context,
            dataSourceName,
            boundaryType: 'data_fetch',
        }} fallback={(props) => (<DataFetchErrorFallback {...props} dataSourceName={dataSourceName}/>)}>
      {children}
    </ErrorBoundary_1.ErrorBoundary>);
};
exports.DataFetchErrorBoundary = DataFetchErrorBoundary;
