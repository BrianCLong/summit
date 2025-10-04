/**
 * Step-Up Authentication Modal
 *
 * Prompts users for WebAuthn authentication when accessing risky routes.
 */

import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (attestation: StepUpAttestation) => void;
  onError: (error: Error) => void;
  route: string;
  reason: string;
  help?: string;
}

interface StepUpAttestation {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  timestamp: number;
  attestationReference: string;
}

export const StepUpAuthModal: React.FC<StepUpAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  route,
  reason,
  help,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);

      // Fetch authentication options from server
      const optionsResponse = await fetch('/api/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route }),
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to fetch authentication options');
      }

      const options = await optionsResponse.json();

      // Start WebAuthn authentication
      const assertion = await startAuthentication(options);

      // Verify assertion with server
      const verifyResponse = await fetch('/api/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion,
          route,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication verification failed');
      }

      const result = await verifyResponse.json();

      // Build attestation object
      const attestation: StepUpAttestation = {
        credentialId: assertion.id,
        authenticatorData: assertion.response.authenticatorData,
        clientDataJSON: assertion.response.clientDataJSON,
        signature: assertion.response.signature,
        timestamp: Date.now() * 1000000, // nanoseconds
        attestationReference: result.attestationReference,
      };

      // Emit success
      onSuccess(attestation);
      onClose();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      onError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    // Auto-trigger authentication when modal opens
    if (isOpen && !isAuthenticating && !error) {
      handleAuthenticate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Authentication Required</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">{reason}</p>
          <p className="text-sm text-gray-500 mb-2">
            <strong>Route:</strong> {route}
          </p>
          {help && (
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
              {help}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isAuthenticating && (
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">Authenticating...</span>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            disabled={isAuthenticating}
          >
            Cancel
          </button>
          <button
            onClick={handleAuthenticate}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Authenticating...' : 'Retry Authentication'}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            This operation requires step-up authentication to ensure security. Your device will
            prompt you for biometric authentication or security key verification.
          </p>
        </div>
      </div>
    </div>
  );
};
