/**
 * Team Pulse - Shows team members' current status and assignments
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material';

export interface TeamMember {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  status: {
    online: boolean;
    statusMessage?: string;
    availableForAssignment: boolean;
  };
  currentAssignment?: string;
  activeSituationsCount: number;
  eventsAssignedToday: number;
}

export interface TeamPulseProps {
  members: TeamMember[];
  isLoading?: boolean;
}

export const TeamPulse: React.FC<TeamPulseProps> = ({
  members,
  isLoading = false,
}) => {
  const theme = useTheme();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Skeleton variant="text" width="30%" height={24} />
        {[1, 2, 3].map((i) => (
          <Box key={i} display="flex" alignItems="center" gap={2} mt={2}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width="60%" />
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          👥 Team Pulse
        </Typography>
        <Typography
          variant="body2"
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          View All
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={1.5}>
        {members.map((member) => (
          <Box
            key={member.user.id}
            display="flex"
            alignItems="center"
            gap={1.5}
            sx={{
              p: 1,
              borderRadius: 1,
              '&:hover': {
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            {/* Avatar with status indicator */}
            <Box position="relative">
              <Avatar
                src={member.user.avatarUrl}
                sx={{ width: 32, height: 32, fontSize: 14 }}
              >
                {getInitials(member.user.name)}
              </Avatar>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: member.status.availableForAssignment
                    ? theme.palette.success.main
                    : member.status.online
                    ? theme.palette.warning.main
                    : theme.palette.grey[400],
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
              />
            </Box>

            {/* Name and status */}
            <Box flex={1} minWidth={0}>
              <Typography variant="body2" fontWeight={500} noWrap>
                @{member.user.name.split(' ')[0].toLowerCase()}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {member.status.availableForAssignment
                  ? 'Available'
                  : member.currentAssignment
                  ? `Working on: ${member.currentAssignment}`
                  : member.status.statusMessage || 'Busy'}
              </Typography>
            </Box>

            {/* Situation count badge */}
            {member.activeSituationsCount > 0 && (
              <Chip
                size="small"
                label={member.activeSituationsCount}
                sx={{
                  height: 20,
                  minWidth: 20,
                  bgcolor: theme.palette.warning.light,
                  color: theme.palette.warning.dark,
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
        ))}
      </Box>

      <Box mt={2}>
        <Typography
          variant="body2"
          color="primary"
          sx={{
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          + Update Status
        </Typography>
      </Box>
    </Paper>
  );
};

export default TeamPulse;
