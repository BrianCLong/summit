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
exports.StepUpAuthModal = void 0;
// conductor-ui/frontend/src/components/auth/StepUpAuthModal.tsx
const react_1 = __importStar(require("react"));
// Mock API with failure simulation
const performStepUpAuth = async (shouldFail) => {
    console.log('Performing step-up authentication flow...');
    await new Promise((res) => setTimeout(res, 1500));
    if (shouldFail) {
        throw new Error('Multi-factor authentication failed or was cancelled.');
    }
    return { amr: ['pwd', 'mfa'] };
};
const StepUpAuthModal = ({ isOpen, onClose, onSuccess, actionName, }) => {
    const [state, setState] = (0, react_1.useState)('idle');
    const [error, setError] = (0, react_1.useState)('');
    const handleAuth = async () => {
        setState('authenticating');
        setError('');
        try {
            // In a real scenario, you might have a button to test the failure case.
            const result = await performStepUpAuth(false);
            onSuccess(result.amr);
            onClose(); // Close on success
        }
        catch (err) {
            setState('error');
            setError(err.message || 'An unknown error occurred.');
        }
        finally {
            if (state !== 'error')
                setState('idle');
        }
    };
    if (!isOpen)
        return null;
    return (<div className="modal-overlay">
      <div className="modal-content">
        <h2>Additional Verification Required</h2>
        <p>
          To proceed with the action "<strong>{actionName}</strong>", please
          provide additional authentication.
        </p>
        <p>
          This will typically involve a prompt from your multi-factor
          authentication (MFA) device.
        </p>

        {state === 'error' && (<div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
            <p>
              <strong>Authentication Failed:</strong> {error}
            </p>
          </div>)}

        <div className="modal-actions">
          <button onClick={handleAuth} disabled={state === 'authenticating'}>
            {state === 'authenticating'
            ? 'Waiting for MFA...'
            : 'Begin Authentication'}
          </button>
          <button onClick={onClose} disabled={state === 'authenticating'}>
            Cancel
          </button>
        </div>
      </div>
    </div>);
};
exports.StepUpAuthModal = StepUpAuthModal;
