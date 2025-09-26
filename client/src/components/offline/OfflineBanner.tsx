import React from 'react';
import { Alert, Button, Collapse, Stack, Typography } from '@mui/material';
import { useOffline } from '../../context/OfflineContext';

export default function OfflineBanner() {
  const { isOffline, lastSync, pendingMutations, flushPending } = useOffline();

  const formattedSync = lastSync ? new Date(lastSync).toLocaleString() : null;

  if (!isOffline && pendingMutations === 0) {
    return null;
  }

  return (
    <Stack spacing={1} data-testid="offline-banner" sx={{ mb: 2 }}>
      <Collapse in={isOffline} appear>
        <Alert severity="warning" variant="outlined">
          <Stack direction="column" spacing={0.5}>
            <Typography variant="subtitle2">Offline mode</Typography>
            <Typography variant="body2">
              You're viewing cached data while the connection is unavailable.
            </Typography>
            {formattedSync && (
              <Typography variant="caption" color="text.secondary">
                Last successful sync: {formattedSync}
              </Typography>
            )}
          </Stack>
        </Alert>
      </Collapse>

      <Collapse in={pendingMutations > 0} appear>
        <Alert
          severity={isOffline ? 'info' : 'success'}
          variant="outlined"
          action={
            !isOffline && (
              <Button size="small" onClick={() => flushPending()} data-testid="offline-sync-button">
                Sync now
              </Button>
            )
          }
          data-testid="offline-mutation-alert"
        >
          <Typography variant="body2">
            {pendingMutations} change{pendingMutations === 1 ? '' : 's'} will sync once connectivity is restored.
          </Typography>
        </Alert>
      </Collapse>
    </Stack>
  );
}
