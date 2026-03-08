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
const material_1 = require("@mui/material");
const telemetry_1 = require("../telemetry");
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        (0, telemetry_1.trackError)(error, 'ErrorBoundary');
    }
    render() {
        if (this.state.hasError) {
            return (<material_1.Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" p={3} textAlign="center">
          <material_1.Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </material_1.Typography>
          <material_1.Typography variant="body1" color="textSecondary" paragraph>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </material_1.Typography>
          <material_1.Button variant="contained" color="primary" onClick={() => window.location.reload()}>
            Reload Page
          </material_1.Button>
        </material_1.Box>);
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
