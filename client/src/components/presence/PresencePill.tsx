import React from 'react';
import { Chip, Avatar, AvatarGroup, Tooltip, Box } from '@mui/material';
const mockPresence = [
  { userId: '1', displayName: 'Analyst A', status: 'active' },
  { userId: '2', displayName: 'Analyst B', status: 'reviewing' },
  { userId: '3', displayName: 'Analyst C', status: 'active' },
  { userId: '4', displayName: 'Analyst D', status: 'away' },
];

interface PresencePillProps {
  caseId?: string;
  platformWide?: boolean;
}

export function PresencePill({
  caseId,
  platformWide = false,
}: PresencePillProps) {
  const users = platformWide || !caseId ? mockPresence : mockPresence.slice(0, 2);

  if (users.length === 0) {
    return null;
  }

  const displayUsers = users.slice(0, 3);
  const overflow = users.length - 3;

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      aria-live="polite"
    >
      <AvatarGroup
        max={4}
        sx={{
          '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' },
        }}
      >
        {displayUsers.map((user: any) => (
          <Tooltip
            key={user.userId}
            title={`${user.displayName} (${user.status})`}
          >
            <Avatar>{user.displayName.charAt(0).toUpperCase()}</Avatar>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Avatar sx={{ fontSize: '0.6rem' }}>+{overflow}</Avatar>
        )}
      </AvatarGroup>

      <Chip
        size="small"
        label={`${users.length} active`}
        color="primary"
        variant="outlined"
        sx={{
          height: 20,
          '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
        }}
      />
    </Box>
  );
}
