// conductor-ui/frontend/src/components/auth/StepUpAuthModal.tsx
import React, { useState } from 'react';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAmr: string[]) => void;
  actionName: string; // e.g., "delete a critical resource"
}

// Mock API with failure simulation
const performStepUpAuth = async (
  shouldFail: boolean,
): Promise<{ amr: string[] }> => {
  console.log('Performing step-up authentication flow...');
  await new Promise((res) => setTimeout(res, 1500));
  if (shouldFail) {
    throw new Error('Multi-factor authentication failed or was cancelled.');
  }
  return { amr: ['pwd', 'mfa'] };
};

export const StepUpAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  actionName,
}: StepUpAuthModalProps) => {
  const [state, setState] = useState<'idle' | 'authenticating' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setState('authenticating');
    setError('');
    try {
      // In a real scenario, you might have a button to test the failure case.
      const result = await performStepUpAuth(false);
      onSuccess(result.amr);
      onClose(); // Close on success
    } catch (err: any) {
      setState('error');
      setError(err.message || 'An unknown error occurred.');
    } finally {
      if (state !== 'error') setState('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
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

        {state === 'error' && (
          <div
            className="error-message"
            style={{ color: 'red', marginBottom: '1rem' }}
          >
            <p>
              <strong>Authentication Failed:</strong> {error}
            </p>
          </div>
        )}

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
    </div>
  );
};
