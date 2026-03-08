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
exports.PinGate = PinGate;
/**
 * PIN Gate Component
 * Requires PIN or biometric authentication before accessing app
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AuthContext_1 = require("@/contexts/AuthContext");
function PinGate({ children }) {
    const { user, isPinVerified, isLocked, pinAttempts, verifyPin, verifyBiometric, isBiometricAvailable, securityConfig, } = (0, AuthContext_1.useAuth)();
    const [pin, setPin] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const [isVerifying, setIsVerifying] = (0, react_1.useState)(false);
    const [biometricAvailable, setBiometricAvailable] = (0, react_1.useState)(false);
    // Check biometric availability
    (0, react_1.useEffect)(() => {
        isBiometricAvailable().then(setBiometricAvailable);
    }, [isBiometricAvailable]);
    // If PIN not required or already verified, show children
    if (!securityConfig.requirePin || isPinVerified) {
        return <>{children}</>;
    }
    const handlePinPress = (digit) => {
        if (pin.length < 6 && !isLocked) {
            const newPin = pin + digit;
            setPin(newPin);
            // Auto-submit on 6 digits
            if (newPin.length === 6) {
                handleVerifyPin(newPin);
            }
        }
    };
    const handleBackspace = () => {
        setPin((prev) => prev.slice(0, -1));
        setError(null);
    };
    const handleVerifyPin = async (pinToVerify) => {
        setIsVerifying(true);
        setError(null);
        try {
            const success = await verifyPin(pinToVerify);
            if (!success) {
                setError(`Incorrect PIN. ${securityConfig.maxFailedAttempts - pinAttempts - 1} attempts remaining.`);
                setPin('');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
            setPin('');
        }
        finally {
            setIsVerifying(false);
        }
    };
    const handleBiometric = async () => {
        setIsVerifying(true);
        setError(null);
        try {
            const success = await verifyBiometric();
            if (!success) {
                setError('Biometric verification failed');
            }
        }
        catch (err) {
            setError('Biometric not available');
        }
        finally {
            setIsVerifying(false);
        }
    };
    const renderPinDots = () => (<material_1.Box display="flex" gap={2} justifyContent="center" mb={4}>
      {Array.from({ length: 6 }).map((_, i) => (<material_1.Box key={i} sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: i < pin.length ? 'primary.main' : 'action.disabled',
                transition: 'background-color 0.2s',
            }}/>))}
    </material_1.Box>);
    const renderKeypad = () => (<material_1.Box sx={{ maxWidth: 280, mx: 'auto' }}>
      {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['bio', '0', 'del'],
        ].map((row, rowIndex) => (<material_1.Box key={rowIndex} display="flex" justifyContent="center" gap={2} mb={2}>
          {row.map((key) => {
                if (key === 'bio') {
                    return (<material_1.IconButton key={key} onClick={handleBiometric} disabled={!biometricAvailable || isVerifying || isLocked} sx={{
                            width: 72,
                            height: 72,
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'action.selected' },
                        }}>
                  <icons_material_1.Fingerprint />
                </material_1.IconButton>);
                }
                if (key === 'del') {
                    return (<material_1.IconButton key={key} onClick={handleBackspace} disabled={pin.length === 0 || isVerifying} sx={{
                            width: 72,
                            height: 72,
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'action.selected' },
                        }}>
                  <icons_material_1.Backspace />
                </material_1.IconButton>);
                }
                return (<material_1.Button key={key} onClick={() => handlePinPress(key)} disabled={isVerifying || isLocked} sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        fontSize: '1.5rem',
                        fontWeight: 500,
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                    }}>
                {key}
              </material_1.Button>);
            })}
        </material_1.Box>))}
    </material_1.Box>);
    return (<material_1.Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            bgcolor: 'background.default',
        }}>
      {/* User avatar and lock icon */}
      <material_1.Box sx={{ textAlign: 'center', mb: 4 }}>
        {user ? (<>
            <material_1.Avatar sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
            }}>
              {user.name.charAt(0).toUpperCase()}
            </material_1.Avatar>
            <material_1.Typography variant="h6">{user.name}</material_1.Typography>
          </>) : (<>
            <icons_material_1.LockOutlined sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}/>
            <material_1.Typography variant="h6">Enter PIN</material_1.Typography>
          </>)}
      </material_1.Box>

      {/* Error message */}
      {error && (<material_1.Alert severity="error" sx={{ mb: 3, maxWidth: 300 }}>
          {error}
        </material_1.Alert>)}

      {/* Locked message */}
      {isLocked && (<material_1.Alert severity="warning" sx={{ mb: 3, maxWidth: 300 }}>
          Too many failed attempts. Please wait before trying again.
        </material_1.Alert>)}

      {/* Loading indicator */}
      {isVerifying && (<material_1.CircularProgress sx={{ mb: 3 }}/>)}

      {/* PIN dots */}
      {!isVerifying && renderPinDots()}

      {/* Keypad */}
      {!isVerifying && renderKeypad()}

      {/* Biometric hint */}
      {biometricAvailable && !isLocked && (<material_1.Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
          Tap fingerprint icon to use biometric
        </material_1.Typography>)}
    </material_1.Box>);
}
exports.default = PinGate;
