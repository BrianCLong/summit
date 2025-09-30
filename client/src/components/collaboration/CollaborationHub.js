import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  Group,
  Chat,
  Visibility,
  Settings,
  Close,
  Notifications,
  NotificationsOff,
  VideoCall,
  ScreenShare,
  Mic,
  MicOff,
  PersonAdd,
  Share,
  History,
  Assessment,
  Warning,
  CheckCircle,
  Info,
} from '@mui/icons-material';

import SharedCursors from './SharedCursors';
import LiveChat from './LiveChat';
import UserPresence from './UserPresence';

function CollaborationHub({
  websocketService,
  currentUser,
  investigationId,
  graphContainerRef,
  onUserActivity,
  onInviteUser,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(true);
  const [presenceVisible, setPresenceVisible] = useState(true);
  const [cursorsEnabled, setCursorsEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [collaborationStats, setCollaborationStats] = useState({
    activeUsers: 0,
    totalMessages: 0,
    totalSessions: 0,
    averageSessionTime: '0m',
  });

  // Activity tracking
  const [recentActivities, setRecentActivities] = useState([]);
  const [conflictAlerts, setConflictAlerts] = useState([]);

  useEffect(() => {
    if (!websocketService) return;

    // Connection status monitoring
    const handleConnect = () => setConnectionStatus('connected');
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleReconnect = () => setConnectionStatus('reconnecting');

    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('reconnecting', handleReconnect);

    // Collaboration events
    const handleCollaborationEvent = (data) => {
      setRecentActivities((prev) => [
        {
          id: Date.now(),
          ...data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 49),
      ]); // Keep last 50 activities

      // Update stats
      if (data.type === 'user_joined') {
        setCollaborationStats((prev) => ({
          ...prev,
          activeUsers: data.activeUserCount || prev.activeUsers + 1,
        }));
      }

      // Track user activity
      if (onUserActivity) {
        onUserActivity(data);
      }
    };

    const handleConflictAlert = (data) => {
      setConflictAlerts((prev) => [
        {
          id: Date.now(),
          ...data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]); // Keep last 10 alerts
    };

    const handleStatsUpdate = (stats) => {
      setCollaborationStats(stats);
    };

    websocketService.on('collaboration_event', handleCollaborationEvent);
    websocketService.on('conflict_alert', handleConflictAlert);
    websocketService.on('collaboration_stats', handleStatsUpdate);

    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('reconnecting', handleReconnect);
      websocketService.off('collaboration_event', handleCollaborationEvent);
      websocketService.off('conflict_alert', handleConflictAlert);
      websocketService.off('collaboration_stats', handleStatsUpdate);
    };
  }, [websocketService, onUserActivity]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'reconnecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'reconnecting':
        return 'Reconnecting...';
      default:
        return 'Unknown';
    }
  };

  const handleInviteUser = () => {
    setInviteDialog(true);
  };

  const ActivityFeed = () => (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      <List dense>
        {recentActivities.map((activity) => (
          <ListItem key={activity.id}>
            <ListItemIcon>
              {activity.type === 'user_joined' && <PersonAdd />}
              {activity.type === 'message_sent' && <Chat />}
              {activity.type === 'graph_edited' && <Assessment />}
              {activity.type === 'analysis_run' && <Assessment />}
            </ListItemIcon>
            <ListItemText
              primary={
                activity.description || `${activity.userName} ${activity.type.replace('_', ' ')}`
              }
              secondary={activity.timestamp.toLocaleTimeString()}
            />
          </ListItem>
        ))}
        {recentActivities.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No recent activity
          </Typography>
        )}
      </List>
    </Box>
  );

  const ConflictAlerts = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Conflict Alerts
      </Typography>
      {conflictAlerts.map((alert) => (
        <Alert
          key={alert.id}
          severity={alert.severity || 'warning'}
          sx={{ mb: 1 }}
          action={
            <Button
              size="small"
              onClick={() => {
                setConflictAlerts((prev) => prev.filter((a) => a.id !== alert.id));
              }}
            >
              Resolve
            </Button>
          }
        >
          <Typography variant="body2">{alert.message}</Typography>
          <Typography variant="caption" color="text.secondary">
            {alert.timestamp.toLocaleString()}
          </Typography>
        </Alert>
      ))}
      {conflictAlerts.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          No conflicts detected
        </Typography>
      )}
    </Box>
  );

  const CollaborationSettings = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Collaboration Settings
      </Typography>

      <FormControlLabel
        control={
          <Switch checked={cursorsEnabled} onChange={(e) => setCursorsEnabled(e.target.checked)} />
        }
        label="Show shared cursors"
        sx={{ mb: 2, display: 'block' }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={presenceVisible}
            onChange={(e) => setPresenceVisible(e.target.checked)}
          />
        }
        label="Show user presence"
        sx={{ mb: 2, display: 'block' }}
      />

      <FormControlLabel
        control={
          <Switch checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
        }
        label="Enable notifications"
        sx={{ mb: 2, display: 'block' }}
      />

      <FormControlLabel
        control={
          <Switch checked={!chatMinimized} onChange={(e) => setChatMinimized(!e.target.checked)} />
        }
        label="Keep chat expanded"
        sx={{ mb: 2, display: 'block' }}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Connection Status
      </Typography>
      <Chip
        icon={connectionStatus === 'connected' ? <CheckCircle /> : <Warning />}
        label={getConnectionStatusText()}
        color={getConnectionStatusColor()}
        variant="outlined"
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" gutterBottom>
        Collaboration Statistics
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 1 }}>
            <Typography variant="h6">{collaborationStats.activeUsers}</Typography>
            <Typography variant="caption">Active Users</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent sx={{ p: 1 }}>
            <Typography variant="h6">{collaborationStats.totalMessages}</Typography>
            <Typography variant="caption">Messages</Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const InviteDialog = () => (
    <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Collaborators</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Email addresses"
          placeholder="Enter email addresses separated by commas"
          multiline
          rows={3}
          sx={{ mb: 2, mt: 1 }}
        />
        <TextField
          fullWidth
          label="Invitation message"
          placeholder="Optional message to include with the invitation"
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        <Alert severity="info">
          Invited users will receive an email with a link to join this investigation.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            // Handle invite logic
            setInviteDialog(false);
            if (onInviteUser) onInviteUser();
          }}
        >
          Send Invitations
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {/* Collaboration Components */}
      {cursorsEnabled && (
        <SharedCursors
          websocketService={websocketService}
          currentUser={currentUser}
          containerRef={graphContainerRef}
          onUserActivity={onUserActivity}
        />
      )}

      <LiveChat
        websocketService={websocketService}
        currentUser={currentUser}
        investigationId={investigationId}
        isMinimized={chatMinimized}
        onToggleMinimize={setChatMinimized}
      />

      {presenceVisible && (
        <UserPresence
          websocketService={websocketService}
          currentUser={currentUser}
          investigationId={investigationId}
          showDetailed={false}
          onUserClick={(user) => {
            // Handle user click - could open profile or start chat
            console.log('User clicked:', user);
          }}
          onInviteUser={handleInviteUser}
        />
      )}

      {/* Collaboration Sidebar Toggle */}
      <Tooltip title="Collaboration Hub">
        <IconButton
          sx={{
            position: 'fixed',
            top: 100,
            right: 16,
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { boxShadow: 3 },
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <Badge badgeContent={conflictAlerts.length} color="error">
            <Group />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Collaboration Sidebar */}
      <Drawer
        anchor="right"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Collaboration Hub</Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              icon={connectionStatus === 'connected' ? <CheckCircle /> : <Warning />}
              label={getConnectionStatusText()}
              color={getConnectionStatusColor()}
              size="small"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              {collaborationStats.activeUsers} active
            </Typography>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Activity" icon={<History />} iconPosition="start" />
          <Tab
            label={
              <Badge badgeContent={conflictAlerts.length} color="error">
                Alerts
              </Badge>
            }
            icon={<Warning />}
            iconPosition="start"
          />
          <Tab label="Settings" icon={<Settings />} iconPosition="start" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {activeTab === 0 && <ActivityFeed />}
          {activeTab === 1 && <ConflictAlerts />}
          {activeTab === 2 && <CollaborationSettings />}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button fullWidth variant="outlined" startIcon={<PersonAdd />} onClick={handleInviteUser}>
            Invite Collaborators
          </Button>
        </Box>
      </Drawer>

      <InviteDialog />
    </Box>
  );
}

export default CollaborationHub;
