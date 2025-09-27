/**
 * WebAuthn Step-Up Authentication Dialog
 *
 * Modal dialog for requiring additional authentication for sensitive operations
 * like accessing restricted data or performing administrative actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWebAuthnStepUp } from '../../hooks/useWebAuthnStepUp';

export interface StepUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credential: any) => void;
  onError: (error: Error) => void;
  challenge: string;
  operationType: 'data_access' | 'admin_action' | 'export' | 'delete';
  operationDescription: string;
  allowBiometric?: boolean;
  allowSecurityKey?: boolean;
  timeout?: number; // milliseconds
}

export interface StepUpCredential {
  id: string;
  type: 'public-key';
  response: {
    authenticatorData: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle?: ArrayBuffer;
  };
}

const StepUpDialog: React.FC<StepUpDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  challenge,
  operationType,
  operationDescription,
  allowBiometric = true,
  allowSecurityKey = true,
  timeout = 60000
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'security_key' | null>(null);
  const [timeLeft, setTimeLeft] = useState(Math.floor(timeout / 1000));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isSupported,
    authenticate,
    getAvailableCredentials,
    availableCredentials
  } = useWebAuthnStepUp();

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onError(new Error('Authentication timeout'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onError]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsAuthenticating(false);
      setAuthMethod(null);
      setTimeLeft(Math.floor(timeout / 1000));
      setErrorMessage(null);
    }
  }, [isOpen, timeout]);

  const handleAuthenticate = useCallback(async (method: 'biometric' | 'security_key') => {
    if (!isSupported) {
      onError(new Error('WebAuthn not supported in this browser'));
      return;
    }

    setIsAuthenticating(true);
    setAuthMethod(method);
    setErrorMessage(null);

    try {
      const credential = await authenticate({
        challenge,
        userVerification: method === 'biometric' ? 'required' : 'preferred',
        authenticatorSelection: {
          authenticatorAttachment: method === 'biometric' ? 'platform' : 'cross-platform',
          userVerification: method === 'biometric' ? 'required' : 'preferred',
          requireResidentKey: false
        },
        timeout
      });

      onSuccess(credential);
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);

      let errorMsg = 'Authentication failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg = 'Authentication was cancelled or denied';
        } else if (error.name === 'InvalidStateError') {
          errorMsg = 'Authenticator is already registered';
        } else if (error.name === 'NotSupportedError') {
          errorMsg = 'This authenticator is not supported';
        } else if (error.name === 'SecurityError') {
          errorMsg = 'Security error occurred during authentication';
        } else if (error.name === 'AbortError') {
          errorMsg = 'Authentication was aborted';
        } else {
          errorMsg = error.message;
        }
      }

      setErrorMessage(errorMsg);
      onError(error instanceof Error ? error : new Error(errorMsg));
    } finally {
      setIsAuthenticating(false);
      setAuthMethod(null);
    }
  }, [isSupported, authenticate, challenge, timeout, onSuccess, onError]);

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOperationIcon = (type: string): string => {
    switch (type) {
      case 'data_access': return '🔍';
      case 'admin_action': return '⚙️';
      case 'export': return '📤';
      case 'delete': return '🗑️';
      default: return '🔒';
    }
  };

  const getOperationColor = (type: string): string => {
    switch (type) {
      case 'data_access': return '#3b82f6';
      case 'admin_action': return '#f59e0b';
      case 'export': return '#10b981';
      case 'delete': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            color: getOperationColor(operationType)
          }}>
            {getOperationIcon(operationType)}
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Additional Authentication Required
          </h2>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '16px'
          }}>
            {operationDescription}
          </p>
        </div>

        {/* Timer */}
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
            Time remaining
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: timeLeft <= 30 ? '#ef4444' : '#1f2937',
            fontFamily: 'monospace'
          }}>
            {formatTimeLeft(timeLeft)}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ color: '#dc2626', fontSize: '14px' }}>
              ❌ {errorMessage}
            </div>
          </div>
        )}

        {/* Not Supported Message */}
        {!isSupported && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#92400e', fontSize: '14px' }}>
              ⚠️ WebAuthn is not supported in your browser. Please use a modern browser with biometric or security key support.
            </div>
          </div>
        )}

        {/* Authentication Options */}
        {isSupported && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '12px'
            }}>
              Choose authentication method:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Biometric Option */}
              {allowBiometric && (
                <button
                  onClick={() => handleAuthenticate('biometric')}
                  disabled={isAuthenticating || timeLeft === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: isAuthenticating && authMethod === 'biometric' ? '#f3f4f6' : 'white',
                    cursor: isAuthenticating || timeLeft === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    fontSize: '16px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAuthenticating && timeLeft > 0) {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAuthenticating) {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ fontSize: '24px' }}>📱</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                      Biometric Authentication
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Use fingerprint, face ID, or other biometric
                    </div>
                  </div>
                  {isAuthenticating && authMethod === 'biometric' && (
                    <div style={{ fontSize: '14px', color: '#3b82f6' }}>
                      Authenticating...
                    </div>
                  )}
                </button>
              )}

              {/* Security Key Option */}
              {allowSecurityKey && (
                <button
                  onClick={() => handleAuthenticate('security_key')}
                  disabled={isAuthenticating || timeLeft === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: isAuthenticating && authMethod === 'security_key' ? '#f3f4f6' : 'white',
                    cursor: isAuthenticating || timeLeft === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    fontSize: '16px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAuthenticating && timeLeft > 0) {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAuthenticating) {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ fontSize: '24px' }}>🔑</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                      Security Key
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Use YubiKey, FIDO2, or other hardware key
                    </div>
                  </div>
                  {isAuthenticating && authMethod === 'security_key' && (
                    <div style={{ fontSize: '14px', color: '#3b82f6' }}>
                      Insert key...
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            This additional authentication helps protect sensitive operations
          </div>
          <button
            onClick={onClose}
            disabled={isAuthenticating}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>

        {/* Available Credentials Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && availableCredentials.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <strong>Debug:</strong> Found {availableCredentials.length} registered credential(s)
          </div>
        )}
      </div>
    </div>
  );
};

export default StepUpDialog;