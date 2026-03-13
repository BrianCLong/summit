/**
 * Summit War Room — Toolbar
 *
 * Top command bar with investigation controls, theme toggle,
 * collaboration presence, and command palette trigger.
 */

import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupIcon from '@mui/icons-material/Group';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import { useWarRoomStore } from './store';

export const WarRoomToolbar: React.FC = () => {
  const themeMode = useWarRoomStore((s) => s.themeMode);
  const toggleTheme = useWarRoomStore((s) => s.toggleTheme);
  const toggleSidebar = useWarRoomStore((s) => s.toggleSidebar);
  const toggleCommandPalette = useWarRoomStore((s) => s.toggleCommandPalette);
  const toggleContextPanel = useWarRoomStore((s) => s.toggleContextPanel);
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const collaborators = useWarRoomStore((s) => s.collaborators);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 44,
        px: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        gap: 1,
        flexShrink: 0,
      }}
    >
      {/* Sidebar toggle */}
      <Tooltip title="Toggle sidebar">
        <IconButton size="small" onClick={toggleSidebar}>
          <MenuIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Brand */}
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.1em', color: 'primary.main', mr: 1 }}>
        SUMMIT
      </Typography>
      <Divider orientation="vertical" flexItem />

      {/* Active investigation */}
      {activeInvestigation ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {activeInvestigation.title}
          </Typography>
          <Chip
            label={activeInvestigation.status}
            size="small"
            color={activeInvestigation.status === 'active' ? 'success' : 'default'}
          />
          <Chip label={activeInvestigation.priority} size="small" variant="outlined" />
        </Box>
      ) : (
        <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
          No active investigation
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <>
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11 } }}>
            {collaborators.map((c) => (
              <Tooltip key={c.id} title={`${c.name} (${c.role})`}>
                <Avatar sx={{ bgcolor: c.color, width: 24, height: 24, fontSize: 11 }}>
                  {c.name.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Divider orientation="vertical" flexItem />
        </>
      )}

      {collaborators.length === 0 && (
        <>
          <Tooltip title="No active collaborators">
            <IconButton size="small" disabled>
              <GroupIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem />
        </>
      )}

      {/* Command palette */}
      <Tooltip title="Command palette (Ctrl+K)">
        <IconButton size="small" onClick={toggleCommandPalette}>
          <SearchIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Theme toggle */}
      <Tooltip title={themeMode === 'dark' ? 'Switch to Light Analysis Mode' : 'Switch to Dark Intelligence Mode'}>
        <IconButton size="small" onClick={toggleTheme}>
          {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {/* Context panel */}
      <Tooltip title="Toggle context panel">
        <IconButton size="small" onClick={toggleContextPanel}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
