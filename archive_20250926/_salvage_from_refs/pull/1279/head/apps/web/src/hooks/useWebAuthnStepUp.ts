/**
 * WebAuthn Step-Up Authentication Hook
 *
 * Provides functionality for performing step-up authentication using WebAuthn
 * for sensitive operations requiring additional verification.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebAuthnCredential {
  id: string;
  type: 'public-key';
  response: {
    authenticatorData: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle?: ArrayBuffer;
  };
}

export interface AuthenticateOptions {
  challenge: string;
  userVerification?: UserVerificationRequirement;
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    userVerification?: UserVerificationRequirement;
    requireResidentKey?: boolean;
  };
  timeout?: number;
}

export interface CredentialInfo {
  id: string;
  name?: string;
  type: 'platform' | 'cross-platform';
  lastUsed?: Date;
}

export interface UseWebAuthnStepUpReturn {
  isSupported: boolean;
  isLoading: boolean;
  error: Error | null;
  authenticate: (options: AuthenticateOptions) => Promise<WebAuthnCredential>;
  getAvailableCredentials: () => Promise<CredentialInfo[]>;
  availableCredentials: CredentialInfo[];
  clearError: () => void;
}

/**
 * Hook for WebAuthn step-up authentication
 */
export const useWebAuthnStepUp = (): UseWebAuthnStepUpReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [availableCredentials, setAvailableCredentials] = useState<CredentialInfo[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check WebAuthn support on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported = !!(
        window.navigator &&
        window.navigator.credentials &&
        window.navigator.credentials.get &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === 'function'
      );
      setIsSupported(supported);
    };

    checkSupport();
  }, []);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getAvailableCredentials = useCallback(async (): Promise<CredentialInfo[]> => {
    if (!isSupported) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check for conditional mediation support
      const conditionalSupported = await PublicKeyCredential.isConditionalMediationAvailable?.();

      // For now, return mock credentials since there's no standard way
      // to enumerate existing credentials without authentication
      const mockCredentials: CredentialInfo[] = [];

      // In a real implementation, this would come from your backend
      // which tracks registered credentials per user
      if (conditionalSupported) {
        mockCredentials.push({
          id: 'platform-authenticator',
          name: 'Built-in Authenticator',
          type: 'platform',
          lastUsed: new Date(Date.now() - 86400000) // 1 day ago
        });
      }

      setAvailableCredentials(mockCredentials);
      return mockCredentials;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to get available credentials');
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const authenticate = useCallback(async (options: AuthenticateOptions): Promise<WebAuthnCredential> => {
    if (!isSupported) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Cancel any existing authentication
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this authentication
      abortControllerRef.current = new AbortController();

      // Convert challenge string to ArrayBuffer
      const challengeBuffer = new TextEncoder().encode(options.challenge);

      // Build the credential request options
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuffer,
        timeout: options.timeout || 60000,
        userVerification: options.userVerification || 'preferred',
        // allowCredentials can be populated with specific credential IDs
        // if you want to restrict to particular authenticators
        allowCredentials: [],
      };

      // Request authentication
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
        signal: abortControllerRef.current.signal,
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No credential returned from authenticator');
      }

      if (!(credential.response instanceof AuthenticatorAssertionResponse)) {
        throw new Error('Invalid credential response type');
      }

      // Convert the credential to our format
      const webAuthnCredential: WebAuthnCredential = {
        id: credential.id,
        type: 'public-key',
        response: {
          authenticatorData: credential.response.authenticatorData,
          clientDataJSON: credential.response.clientDataJSON,
          signature: credential.response.signature,
          userHandle: credential.response.userHandle || undefined,
        }
      };

      return webAuthnCredential;
    } catch (err) {
      // Handle different types of WebAuthn errors
      let errorObj: Error;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorObj = new Error('Authentication was cancelled');
        } else if (err.name === 'NotAllowedError') {
          errorObj = new Error('Authentication was denied or timed out');
        } else if (err.name === 'InvalidStateError') {
          errorObj = new Error('Authenticator is in an invalid state');
        } else if (err.name === 'NotSupportedError') {
          errorObj = new Error('This authenticator is not supported');
        } else if (err.name === 'SecurityError') {
          errorObj = new Error('Security error during authentication');
        } else if (err.name === 'NetworkError') {
          errorObj = new Error('Network error during authentication');
        } else {
          errorObj = err;
        }
      } else {
        errorObj = new Error('Unknown authentication error');
      }

      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isSupported]);

  // Load available credentials on mount
  useEffect(() => {
    if (isSupported) {
      getAvailableCredentials().catch(() => {
        // Ignore errors during initial load
      });
    }
  }, [isSupported, getAvailableCredentials]);

  return {
    isSupported,
    isLoading,
    error,
    authenticate,
    getAvailableCredentials,
    availableCredentials,
    clearError,
  };
};

export default useWebAuthnStepUp;