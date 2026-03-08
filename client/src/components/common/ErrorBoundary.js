"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFallback = DefaultFallback;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function arraysAreEqual(first, second) {
    if (first === second)
        return true;
    if (!first || !second || first.length !== second.length)
        return false;
    return first.every((value, index) => Object.is(value, second[index]));
}
function DefaultFallback({ error, resetErrorBoundary, title = 'Something went wrong', }) {
    return (<material_1.Container maxWidth="sm" sx={{ py: 6 }}>
      <material_1.Paper elevation={3} sx={{ p: 3 }} role="alert" aria-live="assertive">
        <material_1.Stack spacing={2}>
          <material_1.Typography variant="h5" component="h1">
            {title}
          </material_1.Typography>

          <material_1.Alert severity="error" sx={{ alignItems: 'flex-start' }}>
            <material_1.Stack spacing={1}>
              <material_1.Typography variant="body1">
                Our team has been notified. You can try to reload the app to
                continue.
              </material_1.Typography>
              {error?.message ? (<material_1.Box component="pre" sx={{
                bgcolor: 'grey.100',
                borderRadius: 1,
                p: 1.5,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                m: 0,
            }}>
                  {error.message}
                </material_1.Box>) : null}
            </material_1.Stack>
          </material_1.Alert>

          <material_1.Stack direction="row" spacing={2}>
            {resetErrorBoundary ? (<material_1.Button variant="contained" color="primary" onClick={resetErrorBoundary}>
                Try again
              </material_1.Button>) : null}
            <material_1.Button variant="outlined" color="secondary" onClick={() => window.location.reload()}>
              Reload app
            </material_1.Button>
          </material_1.Stack>
        </material_1.Stack>
      </material_1.Paper>
    </material_1.Container>);
}
class ErrorBoundary extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // eslint-disable-next-line no-console
        console.error('UI ErrorBoundary captured an error', { error, errorInfo });
        this.props.onError?.(error, errorInfo);
        this.setState({ errorInfo });
    }
    componentDidUpdate(prevProps) {
        if (this.state.hasError &&
            !arraysAreEqual(prevProps.resetKeys, this.props.resetKeys)) {
            this.resetErrorBoundary();
        }
    }
    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        this.props.onReset?.();
    };
    render() {
        if (this.state.hasError) {
            if (typeof this.props.fallback === 'function') {
                return this.props.fallback(this.state.error, this.state.errorInfo, this.resetErrorBoundary);
            }
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<DefaultFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary}/>);
        }
        return this.props.children;
    }
}
exports.default = ErrorBoundary;
