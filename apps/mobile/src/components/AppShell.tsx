/**
 * App Shell Component
 * Main layout with bottom navigation and network status
 */
import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Badge,
} from '@mui/material';
import {
  NotificationsActive,
  Folder,
  Person,
  CloudOff,
  Sync,
  Settings,
} from '@mui/icons-material';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAlerts } from '@/hooks/useAlerts';
import { syncEngine } from '@/lib/syncEngine';

// Navigation items
const navItems = [
  { label: 'Inbox', icon: NotificationsActive, path: '/' },
  { label: 'Cases', icon: Folder, path: '/cases' },
  { label: 'Profile', icon: Person, path: '/profile' },
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, isOnline } = useNetwork();
  const { unreadCount } = useAlerts();

  const [syncState, setSyncState] = React.useState(syncEngine.getState());

  // Subscribe to sync state changes
  React.useEffect(() => {
    return syncEngine.subscribe(setSyncState);
  }, []);

  // Find current nav index
  const currentNavIndex = navItems.findIndex(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
  );

  const handleNavChange = (_: React.SyntheticEvent, newValue: number) => {
    navigate(navItems[newValue].path);
  };

  return (
    <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: 'background.default' }}>
      {/* Top status bar for offline/sync status */}
      {(!isOnline || syncState.isSyncing || syncState.pendingCount > 0) && (
        <Box
          sx={{
            bgcolor: isOnline ? 'warning.dark' : 'error.dark',
            color: 'white',
            py: 0.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          {!isOnline ? (
            <>
              <CloudOff fontSize="small" />
              <Typography variant="caption">Offline mode</Typography>
            </>
          ) : syncState.isSyncing ? (
            <>
              <Sync fontSize="small" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
              <Typography variant="caption">Syncing...</Typography>
            </>
          ) : (
            <>
              <Sync fontSize="small" />
              <Typography variant="caption">
                {syncState.pendingCount} pending changes
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={currentNavIndex >= 0 ? currentNavIndex : 0}
        onChange={handleNavChange}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 64,
            py: 1,
          },
        }}
      >
        {navItems.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={
              index === 0 ? (
                <Badge badgeContent={unreadCount} color="error">
                  <item.icon />
                </Badge>
              ) : (
                <item.icon />
              )
            }
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}

export default AppShell;
