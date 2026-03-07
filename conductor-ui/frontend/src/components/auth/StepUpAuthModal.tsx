// conductor-ui/frontend/src/components/auth/StepUpAuthModal.tsx
import React, { useState } from 'react';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAmr: string[]) => void;
  actionName: string; // e.g., "delete a critical resource"
  sessionId?: string; // session to elevate; falls back to cookie-based session
}

/**
 * Fetch a WebAuthn assertion challenge from the server, perform the credential
 * assertion via the browser WebAuthn API, then post the signed assertion back.
 * Returns the updated Authentication Method References on success.
 */
const performWebAuthnStepUp = async (
  sessionId?: string,
): Promise<{ amr: string[] }> => {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  // 1. Request a challenge from the server.
  const challengeRes = await fetch('/api/auth/webauthn/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, purpose: 'step_up' }),
    credentials: 'include',
  });

  if (!challengeRes.ok) {
    throw new Error(`Failed to fetch WebAuthn challenge: ${challengeRes.status}`);
  }

  const { challenge, rpId, allowCredentials, timeout } = await challengeRes.json();

  // 2. Decode the base64url challenge.
  const challengeBytes = Uint8Array.from(
    atob(challenge.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );

  // 3. Invoke the browser authenticator.
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challengeBytes,
      rpId: rpId ?? window.location.hostname,
      allowCredentials: (allowCredentials ?? []).map(
        (c: { id: string; type: string; transports?: string[] }) => ({
          ...c,
          id: Uint8Array.from(
            atob(c.id.replace(/-/g, '+').replace(/_/g, '/')),
            (ch) => ch.charCodeAt(0),
          ),
        }),
      ),
      userVerification: 'required',
      timeout: timeout ?? 60000,
    },
  });

  if (!assertion || assertion.type !== 'public-key') {
    throw new Error('WebAuthn assertion was not completed.');
  }

  const pk = assertion as PublicKeyCredential;
  const resp = pk.response as AuthenticatorAssertionResponse;

  const toBase64url = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  // 4. Send the signed assertion to the server for verification.
  const verifyRes = await fetch('/api/auth/webauthn/assert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      credentialId: pk.id,
      authenticatorData: toBase64url(resp.authenticatorData),
      clientDataJSON: toBase64url(resp.clientDataJSON),
      signature: toBase64url(resp.signature),
      userHandle: resp.userHandle ? toBase64url(resp.userHandle) : null,
    }),
    credentials: 'include',
  });

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    throw new Error(body.message ?? `Verification failed: ${verifyRes.status}`);
  }

  const { amr } = await verifyRes.json();
  return { amr: amr ?? ['pwd', 'mfa', 'hwk'] };
};

export const StepUpAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  actionName,
  sessionId,
}: StepUpAuthModalProps) => {
  const [state, setState] = useState<'idle' | 'authenticating' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setState('authenticating');
    setError('');
    try {
      const result = await performWebAuthnStepUp(sessionId);
      onSuccess(result.amr);
      onClose();
    } catch (err: any) {
      setState('error');
      setError(err.message || 'An unknown error occurred.');
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
          This will prompt your security key or platform authenticator (Face ID,
          Touch ID, Windows Hello, etc.).
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
              ? 'Waiting for security key...'
              : 'Authenticate with Security Key'}
          </button>
          <button onClick={onClose} disabled={state === 'authenticating'}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
