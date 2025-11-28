/**
 * PIN Gate Component
 * Requires PIN or biometric authentication before accessing app
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Fingerprint,
  Backspace,
  Security,
  LockOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const {
    user,
    isPinVerified,
    isLocked,
    pinAttempts,
    verifyPin,
    verifyBiometric,
    isBiometricAvailable,
    securityConfig,
  } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, [isBiometricAvailable]);

  // If PIN not required or already verified, show children
  if (!securityConfig.requirePin || isPinVerified) {
    return <>{children}</>;
  }

  const handlePinPress = (digit: string) => {
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

  const handleVerifyPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      const success = await verifyPin(pinToVerify);
      if (!success) {
        setError(`Incorrect PIN. ${securityConfig.maxFailedAttempts - pinAttempts - 1} attempts remaining.`);
        setPin('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setPin('');
    } finally {
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
    } catch (err) {
      setError('Biometric not available');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderPinDots = () => (
    <Box display="flex" gap={2} justifyContent="center" mb={4}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: i < pin.length ? 'primary.main' : 'action.disabled',
            transition: 'background-color 0.2s',
          }}
        />
      ))}
    </Box>
  );

  const renderKeypad = () => (
    <Box sx={{ maxWidth: 280, mx: 'auto' }}>
      {[
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['bio', '0', 'del'],
      ].map((row, rowIndex) => (
        <Box key={rowIndex} display="flex" justifyContent="center" gap={2} mb={2}>
          {row.map((key) => {
            if (key === 'bio') {
              return (
                <IconButton
                  key={key}
                  onClick={handleBiometric}
                  disabled={!biometricAvailable || isVerifying || isLocked}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Fingerprint />
                </IconButton>
              );
            }
            if (key === 'del') {
              return (
                <IconButton
                  key={key}
                  onClick={handleBackspace}
                  disabled={pin.length === 0 || isVerifying}
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Backspace />
                </IconButton>
              );
            }
            return (
              <Button
                key={key}
                onClick={() => handlePinPress(key)}
                disabled={isVerifying || isLocked}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                {key}
              </Button>
            );
          })}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      {/* User avatar and lock icon */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {user ? (
          <>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6">{user.name}</Typography>
          </>
        ) : (
          <>
            <LockOutlined sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6">Enter PIN</Typography>
          </>
        )}
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 300 }}>
          {error}
        </Alert>
      )}

      {/* Locked message */}
      {isLocked && (
        <Alert severity="warning" sx={{ mb: 3, maxWidth: 300 }}>
          Too many failed attempts. Please wait before trying again.
        </Alert>
      )}

      {/* Loading indicator */}
      {isVerifying && (
        <CircularProgress sx={{ mb: 3 }} />
      )}

      {/* PIN dots */}
      {!isVerifying && renderPinDots()}

      {/* Keypad */}
      {!isVerifying && renderKeypad()}

      {/* Biometric hint */}
      {biometricAvailable && !isLocked && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
          Tap fingerprint icon to use biometric
        </Typography>
      )}
    </Box>
  );
}

export default PinGate;
