// client/src/components/common/OfflineBanner.tsx
import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { Wifi, WifiOff, Refresh } from '@mui/icons-material';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export interface OfflineBannerProps {
  onRetry?: () => void;
  message?: string;
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
}

/**
 * Reusable banner component that displays network status
 * Shows offline message when disconnected, optional reconnected message
 */
export function OfflineBanner({
  onRetry,
  message = 'You are currently offline. Some features may be unavailable.',
  showWhenOnline = false,
  position = 'top',
}: OfflineBannerProps) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);

  React.useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      // Auto-hide reconnected message after 5 seconds
      const timer = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected && !showWhenOnline) {
    return null;
  }

  const positionStyles =
    position === 'top'
      ? { top: 0, left: 0, right: 0 }
      : { bottom: 0, left: 0, right: 0 };

  if (showReconnected && isOnline) {
    return (
      <Box
        sx={{
          position: 'sticky',
          zIndex: 1300,
          ...positionStyles,
        }}
      >
        <Alert
          severity="success"
          icon={<Wifi />}
          onClose={() => setShowReconnected(false)}
          sx={{ borderRadius: 0 }}
        >
          <AlertTitle>Back Online</AlertTitle>
          Connection restored. Data will refresh automatically.
        </Alert>
      </Box>
    );
  }

  if (!isOnline) {
    return (
      <Box
        sx={{
          position: 'sticky',
          zIndex: 1300,
          ...positionStyles,
        }}
        role="alert"
        aria-live="polite"
      >
        <Alert
          severity="warning"
          icon={<WifiOff />}
          action={
            onRetry && (
              <Button
                color="inherit"
                size="small"
                startIcon={<Refresh />}
                onClick={onRetry}
              >
                Retry
              </Button>
            )
          }
          sx={{ borderRadius: 0 }}
        >
          <AlertTitle>Offline</AlertTitle>
          {message}
        </Alert>
      </Box>
    );
  }

  return null;
}
