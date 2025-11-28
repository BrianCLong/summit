/**
 * Profile Page
 * User profile, settings, and security options
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Person,
  Security,
  Fingerprint,
  Sync,
  Storage,
  Logout,
  CloudOff,
  CloudDone,
  DeleteForever,
  ChevronRight,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { deviceManager } from '@/lib/deviceManager';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, securityConfig, isBiometricAvailable, deregisterDevice } = useAuth();
  const { status, isOnline } = useNetwork();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [cacheStats, setCacheStats] = useState<{
    cases: number;
    alerts: number;
    tasks: number;
    entities: number;
    pendingSync: number;
  } | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [syncState, setSyncState] = useState(syncEngine.getState());
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, [isBiometricAvailable]);

  // Load cache stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await offlineCache.getStats();
      setCacheStats(stats);

      const storage = await deviceManager.getStorageEstimate();
      setStorageEstimate(storage);
    };
    loadStats();
  }, []);

  // Subscribe to sync state
  useEffect(() => {
    return syncEngine.subscribe(setSyncState);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Handle clear data
  const handleClearData = async () => {
    await offlineCache.clearAll();
    setClearDataDialogOpen(false);
    // Refresh stats
    const stats = await offlineCache.getStats();
    setCacheStats(stats);
  };

  // Handle manual sync
  const handleSync = () => {
    syncEngine.fullSync();
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h5" fontWeight={600}>
          Profile
        </Typography>
      </Box>

      {/* User Info */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
              >
                {user?.name.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h6">{user?.name || 'User'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.role.replace('_', ' ').toUpperCase()}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Network & Sync Status */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Status
        </Typography>
        <Card>
          <List disablePadding>
            <ListItem>
              <ListItemIcon>
                {isOnline ? <CloudDone color="success" /> : <CloudOff color="error" />}
              </ListItemIcon>
              <ListItemText
                primary="Connection"
                secondary={isOnline ? 'Online' : 'Offline'}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Sync />
              </ListItemIcon>
              <ListItemText
                primary="Sync Status"
                secondary={
                  syncState.isSyncing
                    ? 'Syncing...'
                    : syncState.pendingCount > 0
                    ? `${syncState.pendingCount} pending changes`
                    : 'All synced'
                }
              />
              <ListItemSecondaryAction>
                <Button
                  size="small"
                  onClick={handleSync}
                  disabled={!isOnline || syncState.isSyncing}
                >
                  Sync Now
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* Security Settings */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Security
        </Typography>
        <Card>
          <List disablePadding>
            <ListItem>
              <ListItemIcon>
                <Security />
              </ListItemIcon>
              <ListItemText
                primary="PIN Lock"
                secondary="Require PIN to access app"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={securityConfig.requirePin}
                  disabled // Controlled by admin policy
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Fingerprint />
              </ListItemIcon>
              <ListItemText
                primary="Biometric Login"
                secondary={biometricAvailable ? 'Use fingerprint or face' : 'Not available'}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  disabled={!biometricAvailable}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* Storage */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Storage
        </Typography>
        <Card>
          <CardContent>
            {storageEstimate && (
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">
                    {formatBytes(storageEstimate.usage)} used
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatBytes(storageEstimate.quota)} total
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(storageEstimate.usage / storageEstimate.quota) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
            {cacheStats && (
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Chip label={`${cacheStats.cases} cases`} size="small" />
                <Chip label={`${cacheStats.alerts} alerts`} size="small" />
                <Chip label={`${cacheStats.tasks} tasks`} size="small" />
                <Chip label={`${cacheStats.entities} entities`} size="small" />
              </Box>
            )}
          </CardContent>
          <Divider />
          <List disablePadding>
            <ListItem button onClick={() => setClearDataDialogOpen(true)}>
              <ListItemIcon>
                <DeleteForever color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Clear Cached Data"
                secondary="Remove all offline data"
                primaryTypographyProps={{ color: 'error' }}
              />
              <ChevronRight />
            </ListItem>
          </List>
        </Card>
      </Box>

      {/* Logout */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<Logout />}
          onClick={() => setLogoutDialogOpen(true)}
        >
          Sign Out
        </Button>
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>Sign Out?</DialogTitle>
        <DialogContent>
          <Typography>
            {syncState.pendingCount > 0
              ? `You have ${syncState.pendingCount} pending changes that haven't been synced. These changes will be lost if you sign out.`
              : 'Are you sure you want to sign out?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={clearDataDialogOpen} onClose={() => setClearDataDialogOpen(false)}>
        <DialogTitle>Clear Cached Data?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove all locally cached cases, alerts, tasks, and entities.
            Your notes and observations will remain until synced.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDataDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearData} color="error" variant="contained">
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProfilePage;
