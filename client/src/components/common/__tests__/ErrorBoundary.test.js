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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any -- jest-dom matchers require type assertions */
const react_1 = __importStar(require("react"));
require("@testing-library/jest-dom");
const react_2 = require("@testing-library/react");
const styles_1 = require("@mui/material/styles");
// @ts-ignore
const ErrorBoundary_1 = __importDefault(require("../ErrorBoundary"));
const globals_1 = require("@jest/globals");
const theme = (0, styles_1.createTheme)();
const renderWithTheme = (ui) => {
    return (0, react_2.render)(<styles_1.ThemeProvider theme={theme}>{ui}</styles_1.ThemeProvider>);
};
function Thrower({ shouldThrow = false }) {
    if (shouldThrow) {
        throw new Error('Boom');
    }
    return <div>safe child</div>;
}
(0, globals_1.describe)('ErrorBoundary', () => {
    const originalConsoleError = console.error;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.spyOn(console, 'error').mockImplementation(() => { });
    });
    (0, globals_1.afterEach)(() => {
        console.error = originalConsoleError;
    });
    (0, globals_1.it)('renders children when there is no error', () => {
        renderWithTheme(<ErrorBoundary_1.default>
        <Thrower />
      </ErrorBoundary_1.default>);
        (0, globals_1.expect)(react_2.screen.getByText('safe child')).toBeInTheDocument();
    });
    (0, globals_1.it)('renders the default fallback when an error is thrown', () => {
        renderWithTheme(<ErrorBoundary_1.default>
        <Thrower shouldThrow/>
      </ErrorBoundary_1.default>);
        (0, globals_1.expect)(react_2.screen.getByText('Something went wrong')).toBeInTheDocument();
        (0, globals_1.expect)(react_2.screen.getByText(/Try again/i)).toBeInTheDocument();
    });
    (0, globals_1.it)('supports custom fallback renderers', () => {
        renderWithTheme(<ErrorBoundary_1.default fallback={(error) => <div>Custom fallback: {error?.message}</div>}>
        <Thrower shouldThrow/>
      </ErrorBoundary_1.default>);
        (0, globals_1.expect)(react_2.screen.getByText('Custom fallback: Boom')).toBeInTheDocument();
    });
    (0, globals_1.it)('invokes onError when errors are captured', () => {
        const onError = globals_1.jest.fn();
        renderWithTheme(<ErrorBoundary_1.default onError={onError}>
        <Thrower shouldThrow/>
      </ErrorBoundary_1.default>);
        (0, globals_1.expect)(onError).toHaveBeenCalledTimes(1);
        const [errorArg, errorInfo] = onError.mock.calls[0];
        (0, globals_1.expect)(errorArg).toBeInstanceOf(Error);
        (0, globals_1.expect)(errorInfo.componentStack).toContain('Thrower');
    });
    (0, globals_1.it)('can be reset via the reset callback', async () => {
        function Harness() {
            const [shouldThrow, setShouldThrow] = (0, react_1.useState)(true);
            const [resetCalled, setResetCalled] = (0, react_1.useState)(false);
            const handleReset = (0, react_1.useCallback)(() => {
                setShouldThrow(false);
                setResetCalled(true);
            }, []);
            return (<ErrorBoundary_1.default fallback={(_error, _info, reset) => (<button type="button" onClick={() => reset?.()}>
              reset-boundary
            </button>)} onReset={handleReset}>
          <Thrower shouldThrow={shouldThrow}/>
          {resetCalled && <span>reset-called</span>}
        </ErrorBoundary_1.default>);
        }
        renderWithTheme(<Harness />);
        (0, globals_1.expect)(react_2.screen.queryByText('safe child')).not.toBeInTheDocument();
        await (0, react_2.act)(async () => {
            react_2.fireEvent.click(react_2.screen.getByText('reset-boundary'));
        });
        (0, globals_1.expect)(react_2.screen.getByText('safe child')).toBeInTheDocument();
        (0, globals_1.expect)(react_2.screen.getByText('reset-called')).toBeInTheDocument();
    });
    (0, globals_1.it)('resets automatically when resetKeys change', async () => {
        function Harness({ boundaryKey }) {
            const [shouldThrow, setShouldThrow] = (0, react_1.useState)(true);
            return (<>
          <ErrorBoundary_1.default resetKeys={[boundaryKey]}>
            <Thrower shouldThrow={shouldThrow}/>
          </ErrorBoundary_1.default>
          <button type="button" onClick={() => setShouldThrow(false)}>
            make-safe
          </button>
        </>);
        }
        const { rerender } = renderWithTheme(<Harness boundaryKey="first"/>);
        (0, globals_1.expect)(react_2.screen.queryByText('safe child')).not.toBeInTheDocument();
        react_2.fireEvent.click(react_2.screen.getByText('make-safe'));
        rerender(<styles_1.ThemeProvider theme={theme}><Harness boundaryKey="second"/></styles_1.ThemeProvider>);
        await (0, react_2.waitFor)(() => {
            (0, globals_1.expect)(react_2.screen.getByText('safe child')).toBeInTheDocument();
        });
    });
});
