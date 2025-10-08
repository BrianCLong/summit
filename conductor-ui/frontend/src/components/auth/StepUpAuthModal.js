import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/components/auth/StepUpAuthModal.tsx
import { useState } from 'react';
// Mock API with failure simulation
const performStepUpAuth = async (shouldFail) => {
    console.log('Performing step-up authentication flow...');
    await new Promise(res => setTimeout(res, 1500));
    if (shouldFail) {
        throw new Error('Multi-factor authentication failed or was cancelled.');
    }
    return { amr: ['pwd', 'mfa'] };
};
export const StepUpAuthModal = ({ isOpen, onClose, onSuccess, actionName }) => {
    const [state, setState] = useState('idle');
    const [error, setError] = useState('');
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
    return (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "Additional Verification Required" }), _jsxs("p", { children: ["To proceed with the action \"", _jsx("strong", { children: actionName }), "\", please provide additional authentication."] }), _jsx("p", { children: "This will typically involve a prompt from your multi-factor authentication (MFA) device." }), state === 'error' && (_jsx("div", { className: "error-message", style: { color: 'red', marginBottom: '1rem' }, children: _jsxs("p", { children: [_jsx("strong", { children: "Authentication Failed:" }), " ", error] }) })), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { onClick: handleAuth, disabled: state === 'authenticating', children: state === 'authenticating' ? 'Waiting for MFA...' : 'Begin Authentication' }), _jsx("button", { onClick: onClose, disabled: state === 'authenticating', children: "Cancel" })] })] }) }));
};
