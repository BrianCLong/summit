import React, { useEffect, useState } from 'react';
import { Box, Avatar, Tooltip, Typography, Paper } from '@mui/material';
import { useSocket } from '../../hooks/useSocket';
import { useParams } from 'react-router-dom';

function InvestigationPresence() {
  const { id: investigationId } = useParams(); // Get investigation ID from URL params
  const { socket, connected } = useSocket('/realtime'); // Connect to the /realtime namespace
  const [activeUsers, setActiveUsers] = useState({}); // { userId: { username, avatarUrl, sid } }

  useEffect(() => {
    if (connected && investigationId) {
      // Join the investigation room
      socket.emit('join_investigation', { investigationId });

      // Listen for presence updates
      socket.on('presence:join', (data) => {
        setActiveUsers((prevUsers) => ({
          ...prevUsers,
          [data.userId]: {
            username: data.username,
            avatarUrl: data.avatarUrl,
            sid: data.sid,
          },
        }));
      });

      socket.on('presence:leave', (data) => {
        setActiveUsers((prevUsers) => {
          const newUsers = { ...prevUsers };
          delete newUsers[data.userId]; // Remove user when they leave
          return newUsers;
        });
      });

      // Cleanup on unmount or disconnect
      return () => {
        if (socket) {
          socket.emit('leave_investigation', { investigationId });
          socket.off('presence:join');
          socket.off('presence:leave');
        }
      };
    }
  }, [connected, investigationId, socket]);

  const usersArray = Object.values(activeUsers);

  if (!investigationId) {
    return null; // Don't render if no investigation ID
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Active in Investigation:
      </Typography>
      {usersArray.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No one else here
        </Typography>
      ) : (
        usersArray.map((user) => (
          <Tooltip key={user.sid} title={user.username}>
            <Avatar
              alt={user.username}
              src={user.avatarUrl}
              sx={{ width: 24, height: 24, fontSize: 12 }}
            />
          </Tooltip>
        ))
      )}
    </Paper>
  );
}

export default InvestigationPresence;
