import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  AvatarGroup,
  Typography,
  Chip,
  Tooltip,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Badge,
  Popover,
  IconButton,
  Divider,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Group,
  Circle,
  MoreVert,
  Settings,
  Visibility,
  VisibilityOff,
  PersonAdd,
  Message,
  VideoCall,
  Phone,
  Share,
  LocationOn,
  Schedule,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

function UserPresence({
  websocketService,
  currentUser,
  investigationId,
  showDetailed = false,
  position = 'top-right',
  onUserClick,
  onInviteUser,
  maxVisible = 5,
}) {
  const [users, setUsers] = useState(new Map());
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [userActivities, setUserActivities] = useState(new Map());

  // Status colors
  const statusColors = {
    online: '#4caf50',
    away: '#ff9800',
    busy: '#f44336',
    offline: '#9e9e9e',
  };

  useEffect(() => {
    if (!websocketService || !currentUser) return;

    // Join investigation presence room
    websocketService.emit('join_presence', {
      investigationId,
      userId: currentUser.id,
      userName: currentUser.firstName || currentUser.name || 'User',
      avatar: currentUser.avatar,
      status: 'online',
    });

    // Handle user presence updates
    const handleUserJoined = (data) => {
      setUsers((prev) => {
        const newUsers = new Map(prev);
        newUsers.set(data.userId, {
          id: data.userId,
          name: data.userName,
          avatar: data.avatar,
          status: data.status || 'online',
          joinedAt: new Date(),
          lastActivity: new Date(),
          location: data.location,
          isCurrentUser: data.userId === currentUser.id,
        });
        return newUsers;
      });
    };

    const handleUserLeft = (data) => {
      setUsers((prev) => {
        const newUsers = new Map(prev);
        const user = newUsers.get(data.userId);
        if (user) {
          newUsers.set(data.userId, {
            ...user,
            status: 'offline',
            leftAt: new Date(),
          });
        }
        return newUsers;
      });

      // Remove from activities
      setUserActivities((prev) => {
        const newActivities = new Map(prev);
        newActivities.delete(data.userId);
        return newActivities;
      });
    };

    const handleStatusUpdate = (data) => {
      setUsers((prev) => {
        const newUsers = new Map(prev);
        const user = newUsers.get(data.userId);
        if (user) {
          newUsers.set(data.userId, {
            ...user,
            status: data.status,
            lastActivity: new Date(),
            location: data.location || user.location,
          });
        }
        return newUsers;
      });
    };

    const handleUserActivity = (data) => {
      setUserActivities((prev) => {
        const newActivities = new Map(prev);
        newActivities.set(data.userId, {
          action: data.action,
          details: data.details,
          timestamp: new Date(data.timestamp),
          location: data.location,
        });
        return newActivities;
      });

      // Update user last activity
      setUsers((prev) => {
        const newUsers = new Map(prev);
        const user = newUsers.get(data.userId);
        if (user) {
          newUsers.set(data.userId, {
            ...user,
            lastActivity: new Date(data.timestamp),
            location: data.location || user.location,
          });
        }
        return newUsers;
      });
    };

    // Register event listeners
    websocketService.on('user_joined', handleUserJoined);
    websocketService.on('user_left', handleUserLeft);
    websocketService.on('user_status_updated', handleStatusUpdate);
    websocketService.on('user_activity', handleUserActivity);

    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      websocketService.emit('user_heartbeat', {
        investigationId,
        userId: currentUser.id,
        status: document.hidden ? 'away' : 'online',
      });
    }, 30000); // Every 30 seconds

    // Handle visibility change
    const handleVisibilityChange = () => {
      const status = document.hidden ? 'away' : 'online';
      websocketService.emit('user_status_update', {
        investigationId,
        userId: currentUser.id,
        status,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      websocketService.off('user_joined', handleUserJoined);
      websocketService.off('user_left', handleUserLeft);
      websocketService.off('user_status_updated', handleStatusUpdate);
      websocketService.off('user_activity', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);

      // Send leave event
      websocketService.emit('leave_presence', {
        investigationId,
        userId: currentUser.id,
      });
    };
  }, [websocketService, currentUser, investigationId]);

  const activeUsers = Array.from(users.values()).filter(
    (user) =>
      user.status !== 'offline' ||
      (showInactive &&
        user.leftAt &&
        Date.now() - user.leftAt.getTime() < 300000), // Show for 5 minutes after leaving
  );

  const onlineCount = activeUsers.filter(
    (user) => user.status === 'online',
  ).length;
  const awayCount = activeUsers.filter((user) => user.status === 'away').length;

  const getActivityDescription = (userId) => {
    const activity = userActivities.get(userId);
    if (!activity) return null;

    const timeAgo = formatDistanceToNow(activity.timestamp, {
      addSuffix: true,
    });

    switch (activity.action) {
      case 'viewing_graph':
        return `Viewing graph ${timeAgo}`;
      case 'editing_node':
        return `Editing ${activity.details?.nodeLabel || 'node'} ${timeAgo}`;
      case 'running_analysis':
        return `Running ${activity.details?.analysisType || 'analysis'} ${timeAgo}`;
      case 'searching':
        return `Searching for "${activity.details?.query}" ${timeAgo}`;
      default:
        return `Active ${timeAgo}`;
    }
  };

  const UserAvatar = ({ user, size = 40 }) => (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {user.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Circle sx={{ fontSize: 8, color: statusColors[user.status] }} />
            {user.status}
          </Typography>
          {getActivityDescription(user.id) && (
            <Typography variant="caption" color="text.secondary">
              {getActivityDescription(user.id)}
            </Typography>
          )}
          {user.location && (
            <Typography
              variant="caption"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <LocationOn sx={{ fontSize: 12 }} />
              {user.location}
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <Circle
            sx={{
              fontSize: 12,
              color: statusColors[user.status],
              bgcolor: 'background.paper',
              borderRadius: '50%',
              p: 0.25,
            }}
          />
        }
      >
        <Avatar
          src={user.avatar}
          sx={{
            width: size,
            height: size,
            cursor: 'pointer',
            border: user.isCurrentUser ? '2px solid' : 'none',
            borderColor: 'primary.main',
          }}
          onClick={() => onUserClick?.(user)}
        >
          {user.name[0]}
        </Avatar>
      </Badge>
    </Tooltip>
  );

  if (!isVisible) return null;

  return (
    <Box>
      {/* Compact View */}
      {!showDetailed && (
        <Paper
          sx={{
            position: 'fixed',
            top: position.includes('top') ? 16 : 'auto',
            bottom: position.includes('bottom') ? 16 : 'auto',
            right: position.includes('right') ? 16 : 'auto',
            left: position.includes('left') ? 16 : 'auto',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            zIndex: 1000,
            minWidth: 200,
          }}
        >
          <Group color="primary" />

          <AvatarGroup max={maxVisible} sx={{ flexGrow: 1 }}>
            {activeUsers.map((user) => (
              <UserAvatar key={user.id} user={user} size={32} />
            ))}
          </AvatarGroup>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={`${onlineCount} online`}
              color="success"
              variant="outlined"
            />
            {awayCount > 0 && (
              <Chip
                size="small"
                label={`${awayCount} away`}
                color="warning"
                variant="outlined"
              />
            )}
          </Box>

          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVert />
          </IconButton>
        </Paper>
      )}

      {/* Detailed View */}
      {showDetailed && (
        <Card sx={{ width: 300, mb: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Group />
                Team ({activeUsers.length})
              </Typography>
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <Settings />
              </IconButton>
            </Box>

            <List dense>
              {activeUsers.map((user) => (
                <ListItemButton
                  key={user.id}
                  onClick={() => onUserClick?.(user)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemAvatar>
                    <UserAvatar user={user} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {user.name}
                        {user.isCurrentUser && (
                          <Chip label="You" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      getActivityDescription(user.id) ||
                      `${user.status} since ${formatDistanceToNow(user.joinedAt, { addSuffix: true })}`
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small">
                      <Message />
                    </IconButton>
                    <IconButton size="small">
                      <VideoCall />
                    </IconButton>
                  </Box>
                </ListItemButton>
              ))}
            </List>

            {onInviteUser && (
              <>
                <Divider sx={{ my: 1 }} />
                <Button
                  fullWidth
                  startIcon={<PersonAdd />}
                  onClick={onInviteUser}
                  variant="outlined"
                >
                  Invite Collaborator
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* More Options Menu */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List sx={{ width: 200 }}>
          <ListItemButton onClick={() => setSettingsOpen(true)}>
            <Settings sx={{ mr: 1 }} />
            Settings
          </ListItemButton>
          <ListItemButton onClick={() => setIsVisible(false)}>
            <VisibilityOff sx={{ mr: 1 }} />
            Hide Presence
          </ListItemButton>
          <ListItemButton onClick={onInviteUser}>
            <PersonAdd sx={{ mr: 1 }} />
            Invite User
          </ListItemButton>
          <ListItemButton
            onClick={() => navigator.share?.({ url: window.location.href })}
          >
            <Share sx={{ mr: 1 }} />
            Share Investigation
          </ListItemButton>
        </List>
      </Popover>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Presence Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                />
              }
              label="Show my presence to others"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Show recently offline users"
            />
            <Typography variant="body2" color="text.secondary">
              Your presence information helps team members know when you're
              actively working on the investigation.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Hidden State Toggle */}
      {!isVisible && (
        <IconButton
          sx={{
            position: 'fixed',
            top: position.includes('top') ? 16 : 'auto',
            bottom: position.includes('bottom') ? 16 : 'auto',
            right: position.includes('right') ? 16 : 'auto',
            left: position.includes('left') ? 16 : 'auto',
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: 1,
          }}
          onClick={() => setIsVisible(true)}
        >
          <Visibility />
        </IconButton>
      )}
    </Box>
  );
}

export default UserPresence;
