import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Avatar,
  Tooltip,
  Typography,
  Fade,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';

const CursorContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 1000,
  transition: 'all 0.1s ease-out'
}));

const CursorPointer = styled('div')(({ theme, color }) => ({
  width: 0,
  height: 0,
  borderLeft: '8px solid transparent',
  borderRight: '8px solid transparent',
  borderBottom: `12px solid ${color}`,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: '-6px',
    top: '12px',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: `6px solid ${color}`
  }
}));

const UserLabel = styled(Paper)(({ theme, color }) => ({
  position: 'absolute',
  left: '16px',
  top: '-8px',
  padding: '2px 6px',
  borderRadius: '4px',
  backgroundColor: color,
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  boxShadow: theme.shadows[2]
}));

function SharedCursors({ 
  websocketService, 
  currentUser, 
  containerRef,
  onUserActivity 
}) {
  const [cursors, setCursors] = useState(new Map());
  const [isActive, setIsActive] = useState(true);
  const throttleRef = useRef(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // User colors for cursor display
  const userColors = [
    '#1976d2', '#dc004e', '#2e7d32', '#f57c00',
    '#7b1fa2', '#d32f2f', '#0288d1', '#388e3c',
    '#f9a825', '#7cb342', '#00acc1', '#5e35b1'
  ];

  const getUserColor = (userId) => {
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[index % userColors.length];
  };

  useEffect(() => {
    if (!websocketService) return;

    // Listen for cursor updates from other users
    const handleCursorUpdate = (data) => {
      if (data.userId !== currentUser?.id) {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(data.userId, {
            ...data,
            timestamp: Date.now(),
            color: getUserColor(data.userId)
          });
          return newCursors;
        });

        // Notify parent of user activity
        if (onUserActivity) {
          onUserActivity({
            userId: data.userId,
            userName: data.userName,
            action: 'cursor_move',
            position: { x: data.x, y: data.y }
          });
        }
      }
    };

    const handleUserDisconnected = (data) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    };

    // Register event listeners
    websocketService.on('cursor_update', handleCursorUpdate);
    websocketService.on('user_disconnected', handleUserDisconnected);

    return () => {
      websocketService.off('cursor_update', handleCursorUpdate);
      websocketService.off('user_disconnected', handleUserDisconnected);
    };
  }, [websocketService, currentUser, onUserActivity]);

  useEffect(() => {
    if (!containerRef?.current || !websocketService || !currentUser) return;

    const container = containerRef.current;

    const handleMouseMove = (event) => {
      if (!isActive) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Throttle cursor updates to avoid flooding
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      throttleRef.current = setTimeout(() => {
        const lastPos = lastPositionRef.current;
        const distance = Math.sqrt(
          Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2)
        );

        // Only send update if cursor moved significantly
        if (distance > 5) {
          websocketService.emit('cursor_update', {
            userId: currentUser.id,
            userName: currentUser.firstName || currentUser.name || 'User',
            x,
            y,
            containerWidth: rect.width,
            containerHeight: rect.height
          });

          lastPositionRef.current = { x, y };
        }
      }, 50); // Throttle to 20fps
    };

    const handleMouseEnter = () => {
      setIsActive(true);
    };

    const handleMouseLeave = () => {
      setIsActive(false);
      // Send cursor leave event
      websocketService.emit('cursor_leave', {
        userId: currentUser.id
      });
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [containerRef, websocketService, currentUser, isActive]);

  // Clean up old cursors
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const newCursors = new Map();
        for (const [userId, cursor] of prev) {
          // Remove cursors older than 5 seconds
          if (now - cursor.timestamp < 5000) {
            newCursors.set(userId, cursor);
          }
        }
        return newCursors;
      });
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  if (!containerRef?.current) return null;

  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <CursorContainer
          key={cursor.userId}
          sx={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-4px, -2px)'
          }}
        >
          <Fade in timeout={200}>
            <Box>
              <CursorPointer color={cursor.color} />
              <UserLabel color={cursor.color}>
                <Typography variant="caption" sx={{ color: 'white' }}>
                  {cursor.userName}
                </Typography>
              </UserLabel>
            </Box>
          </Fade>
        </CursorContainer>
      ))}
    </>
  );
}

export default SharedCursors;