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
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const Sentry = __importStar(require("@sentry/react-native"));
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        Sentry.captureException(error, {
            extra: errorInfo,
        });
    }
    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };
    render() {
        if (this.state.hasError) {
            return (<react_native_1.View style={styles.container}>
          <react_native_1.Text style={styles.title}>Oops! Something went wrong</react_native_1.Text>
          <react_native_1.Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <react_native_1.Text style={styles.buttonText}>Try Again</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>);
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#666',
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
