import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Avatar,
  Badge,
  Tooltip,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Drawer,
  IconButton,
  Divider,
  Button,
  Collapse,
} from '@mui/material';
import {
  People,
  Visibility,
  Edit,
  Mouse,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Circle,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

function PresenceIndicator({ socket, investigationId }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [investigationParticipants, setInvestigationParticipants] = useState(
    [],
  );
  const [userCursors, setUserCursors] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [presenceDrawerOpen, setPresenceDrawerOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const cursorLayerRef = useRef(null);

  useEffect(() => {
    if (socket) {
      // Listen for presence events
      socket.on('presence:initial', handleInitialPresence);
      socket.on('presence:update', handlePresenceUpdate);
      socket.on('presence:user_online', handleUserOnline);
      socket.on('presence:user_offline', handleUserOffline);
      socket.on('investigation:user_joined', handleUserJoinedInvestigation);
      socket.on('investigation:user_left', handleUserLeftInvestigation);
      socket.on('cursor:update', handleCursorUpdate);
      socket.on('cursor:click', handleCursorClick);
      socket.on('activity:typing', handleTypingIndicator);

      return () => {
        socket.off('presence:initial');
        socket.off('presence:update');
        socket.off('presence:user_online');
        socket.off('presence:user_offline');
        socket.off('investigation:user_joined');
        socket.off('investigation:user_left');
        socket.off('cursor:update');
        socket.off('cursor:click');
        socket.off('activity:typing');
      };
    }
  }, [socket]);

  useEffect(() => {
    // Join investigation room when component mounts
    if (socket && investigationId) {
      socket.emit('investigation:join', { investigationId });
    }

    return () => {
      // Leave investigation room when component unmounts
      if (socket && investigationId) {
        socket.emit('investigation:leave', { investigationId });
      }
    };
  }, [socket, investigationId]);

  useEffect(() => {
    // Set up mouse tracking for cursor sharing
    const handleMouseMove = (e) => {
      if (socket && investigationId) {
        const position = {
          x: e.clientX,
          y: e.clientY,
          element: e.target.id || e.target.className,
        };

        // Throttle cursor updates
        clearTimeout(window.cursorUpdateTimeout);
        window.cursorUpdateTimeout = setTimeout(() => {
          socket.emit('cursor:move', { investigationId, position });
        }, 100);
      }
    };

    const handleMouseClick = (e) => {
      if (socket && investigationId) {
        const position = {
          x: e.clientX,
          y: e.clientY,
          element: e.target.id || e.target.className,
        };

        socket.emit('cursor:click', {
          investigationId,
          position,
          target: {
            id: e.target.id,
            className: e.target.className,
            tagName: e.target.tagName,
          },
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleMouseClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
      clearTimeout(window.cursorUpdateTimeout);
    };
  }, [socket, investigationId]);

  const handleInitialPresence = (data) => {
    setOnlineUsers(data.onlineUsers || []);
  };

  const handlePresenceUpdate = (data) => {
    setOnlineUsers((prev) =>
      prev.map((user) =>
        user.userId === data.userId
          ? { ...user, presence: data.presence }
          : user,
      ),
    );
  };

  const handleUserOnline = (data) => {
    setOnlineUsers((prev) => {
      const exists = prev.find((u) => u.userId === data.userId);
      if (exists) return prev;
      return [
        ...prev,
        {
          userId: data.userId,
          user: data.user,
          presence: { status: 'online', lastSeen: data.timestamp },
        },
      ];
    });
  };

  const handleUserOffline = (data) => {
    setOnlineUsers((prev) =>
      prev.map((user) =>
        user.userId === data.userId
          ? {
              ...user,
              presence: {
                ...user.presence,
                status: 'offline',
                lastSeen: data.timestamp,
              },
            }
          : user,
      ),
    );
  };

  const handleUserJoinedInvestigation = (data) => {
    setInvestigationParticipants((prev) => {
      const exists = prev.find((p) => p.userId === data.userId);
      if (exists) return prev;
      return [
        ...prev,
        {
          userId: data.userId,
          user: data.user,
          joinedAt: data.timestamp,
          lastActivity: data.timestamp,
        },
      ];
    });
  };

  const handleUserLeftInvestigation = (data) => {
    setInvestigationParticipants((prev) =>
      prev.filter((p) => p.userId !== data.userId),
    );

    // Remove cursor
    setUserCursors((prev) => {
      const newCursors = new Map(prev);
      newCursors.delete(data.userId);
      return newCursors;
    });
  };

  const handleCursorUpdate = (data) => {
    setUserCursors((prev) => {
      const newCursors = new Map(prev);
      newCursors.set(data.userId, {
        ...data,
        lastUpdate: Date.now(),
      });
      return newCursors;
    });

    // Auto-remove stale cursors
    setTimeout(() => {
      setUserCursors((prev) => {
        const newCursors = new Map(prev);
        const cursor = newCursors.get(data.userId);
        if (cursor && Date.now() - cursor.lastUpdate > 5000) {
          newCursors.delete(data.userId);
        }
        return newCursors;
      });
    }, 5000);
  };

  const handleCursorClick = (data) => {
    // Show click animation
    const clickIndicator = document.createElement('div');
    clickIndicator.style.position = 'fixed';
    clickIndicator.style.left = `${data.position.x}px`;
    clickIndicator.style.top = `${data.position.y}px`;
    clickIndicator.style.width = '20px';
    clickIndicator.style.height = '20px';
    clickIndicator.style.borderRadius = '50%';
    clickIndicator.style.backgroundColor = getUserColor(data.userId);
    clickIndicator.style.pointerEvents = 'none';
    clickIndicator.style.zIndex = '10000';
    clickIndicator.style.transform = 'scale(0)';
    clickIndicator.style.transition =
      'transform 0.3s ease-out, opacity 0.3s ease-out';
    clickIndicator.style.opacity = '0.8';

    document.body.appendChild(clickIndicator);

    // Animate
    requestAnimationFrame(() => {
      clickIndicator.style.transform = 'scale(2)';
      clickIndicator.style.opacity = '0';
    });

    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(clickIndicator);
    }, 300);
  };

  const handleTypingIndicator = (data) => {
    setTypingUsers((prev) => {
      const newTyping = new Map(prev);
      if (data.isTyping) {
        newTyping.set(data.userId, {
          ...data,
          startTime: Date.now(),
        });
      } else {
        newTyping.delete(data.userId);
      }
      return newTyping;
    });

    // Auto-remove typing indicators after timeout
    if (data.isTyping) {
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newTyping = new Map(prev);
          const typing = newTyping.get(data.userId);
          if (typing && Date.now() - typing.startTime > 3000) {
            newTyping.delete(data.userId);
          }
          return newTyping;
        });
      }, 3000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4caf50';
      case 'away':
        return '#ff9800';
      case 'busy':
        return '#f44336';
      case 'offline':
        return '#9e9e9e';
      default:
        return '#9e9e9e';
    }
  };

  const getUserColor = (userId) => {
    const colors = [
      '#FF6B35',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (user) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <>
      {/* Presence Indicator Button */}
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Show online users">
          <IconButton
            onClick={() => setPresenceDrawerOpen(true)}
            sx={{
              position: 'relative',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Badge badgeContent={onlineUsers.length} color="primary">
              <People />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Active Users Avatars */}
        <Box
          sx={{
            position: 'absolute',
            top: -5,
            right: -5,
            display: 'flex',
            flexDirection: 'row-reverse',
          }}
        >
          {investigationParticipants.slice(0, 3).map((participant, index) => (
            <Tooltip
              key={participant.userId}
              title={`${participant.user.firstName} ${participant.user.lastName} - Active`}
            >
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: getUserColor(participant.userId),
                  fontSize: '0.75rem',
                  border: 2,
                  borderColor: 'background.paper',
                  ml: index > 0 ? -0.5 : 0,
                }}
              >
                {getInitials(participant.user)}
              </Avatar>
            </Tooltip>
          ))}
        </Box>
      </Box>

      {/* Cursor Layer */}
      <Box
        ref={cursorLayerRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {Array.from(userCursors.entries()).map(([userId, cursor]) => (
          <Box
            key={userId}
            sx={{
              position: 'absolute',
              left: cursor.position.x,
              top: cursor.position.y,
              transform: 'translate(-2px, -2px)',
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          >
            <Mouse
              sx={{
                color: getUserColor(userId),
                fontSize: 20,
                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))',
              }}
            />
            <Paper
              elevation={2}
              sx={{
                position: 'absolute',
                left: 20,
                top: -5,
                px: 1,
                py: 0.5,
                bgcolor: getUserColor(userId),
                color: 'white',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: -4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: `4px solid ${getUserColor(userId)}`,
                },
              }}
            >
              {cursor.user.firstName} {cursor.user.lastName}
            </Paper>
          </Box>
        ))}
      </Box>

      {/* Typing Indicators */}
      {typingUsers.size > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 1000,
          }}
        >
          <Paper elevation={3} sx={{ p: 2, maxWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              {Array.from(typingUsers.values())
                .map(
                  (typing) =>
                    `${typing.user.firstName} ${typing.user.lastName}`,
                )
                .join(', ')}{' '}
              {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Presence Drawer */}
      <Drawer
        anchor="right"
        open={presenceDrawerOpen}
        onClose={() => setPresenceDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 350 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            User Presence
          </Typography>

          {/* Investigation Participants */}
          <Typography
            variant="subtitle1"
            sx={{ mb: 1, display: 'flex', alignItems: 'center' }}
          >
            <Visibility sx={{ mr: 1 }} />
            Active in Investigation ({investigationParticipants.length})
          </Typography>

          <List dense>
            {investigationParticipants.map((participant) => (
              <ListItem key={participant.userId}>
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Circle
                        sx={{
                          color: getStatusColor('online'),
                          fontSize: 12,
                        }}
                      />
                    }
                  >
                    <Avatar sx={{ bgcolor: getUserColor(participant.userId) }}>
                      {getInitials(participant.user)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={`${participant.user.firstName} ${participant.user.lastName}`}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        Joined{' '}
                        {formatDistanceToNow(new Date(participant.joinedAt), {
                          addSuffix: true,
                        })}
                      </Typography>
                      {userCursors.has(participant.userId) && (
                        <Chip
                          label="Active cursor"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                      {typingUsers.has(participant.userId) && (
                        <Chip
                          label="Typing..."
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ mt: 0.5, ml: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* All Online Users */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="subtitle1">
              All Online Users (
              {
                onlineUsers.filter((u) => u.presence?.status === 'online')
                  .length
              }
              )
            </Typography>
            <Button
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              endIcon={
                showDetails ? <KeyboardArrowUp /> : <KeyboardArrowDown />
              }
            >
              Details
            </Button>
          </Box>

          <Collapse in={showDetails}>
            <List dense>
              {onlineUsers
                .filter((user) => user.presence?.status === 'online')
                .map((user) => (
                  <ListItem key={user.userId}>
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        badgeContent={
                          <Circle
                            sx={{
                              color: getStatusColor(
                                user.presence?.status || 'offline',
                              ),
                              fontSize: 12,
                            }}
                          />
                        }
                      >
                        <Avatar sx={{ bgcolor: getUserColor(user.userId) }}>
                          {getInitials(user.user)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${user.user.firstName} ${user.user.lastName}`}
                      secondary={
                        <Typography variant="caption">
                          Last seen{' '}
                          {formatDistanceToNow(
                            new Date(user.presence?.lastSeen),
                            { addSuffix: true },
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          </Collapse>
        </Box>
      </Drawer>
    </>
  );
}

export default PresenceIndicator;
