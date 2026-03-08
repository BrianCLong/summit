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
exports.AuthGate = AuthGate;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const LocalAuthentication = __importStar(require("expo-local-authentication"));
const notifications_1 = require("../services/notifications");
function AuthGate({ children }) {
    const [authenticated, setAuthenticated] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)();
    const [canRetry, setCanRetry] = (0, react_1.useState)(true);
    const attemptUnlock = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) {
                // Fail closed if no secure hardware is available
                // In production, this would fallback to a secure App PIN flow.
                setError('Device insecure: Biometric hardware missing or not enrolled.');
                setAuthenticated(false);
                setCanRetry(false); // No point retrying if hardware is missing
                return;
            }
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Summit Intelligence',
                fallbackLabel: 'Enter passcode',
                disableDeviceFallback: false // Allow PIN fallback if biometrics fail
            });
            if (!result.success) {
                setError(result.error ?? 'Authentication failed');
                setAuthenticated(false);
                setCanRetry(true);
                return;
            }
            await (0, notifications_1.registerForPush)();
            setAuthenticated(true);
        }
        catch (err) {
            setError(err.message);
            setAuthenticated(false);
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        attemptUnlock().catch(error => setError(error.message));
    }, [attemptUnlock]);
    if (loading) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1221' }}>
        <react_native_1.ActivityIndicator size="large" color="#5AC8FA"/>
        <react_native_1.Text style={{ marginTop: 20, color: 'white' }}>Validating secure enclave...</react_native_1.Text>
      </react_native_1.View>);
    }
    if (!authenticated) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0B1221' }}>
        <react_native_1.Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 12, color: 'white' }}>Summit Mobile</react_native_1.Text>
        <react_native_1.Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 12, color: '#9FB3D1' }}>Secure Field Kit Access Required</react_native_1.Text>
        {error ? <react_native_1.Text style={{ color: '#FF6B6B', marginBottom: 12, textAlign: 'center' }}>{error}</react_native_1.Text> : null}
        {canRetry && <react_native_1.Button title="Authenticate" onPress={attemptUnlock} color="#5AC8FA"/>}
      </react_native_1.View>);
    }
    return <>{children}</>;
}
