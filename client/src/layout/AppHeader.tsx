/**
 * AppHeader — Summit premium navigation bar.
 *
 * Used in contexts where the full sidebar layout (App.router.jsx) is not
 * active (e.g. embedded views, story-book, tests). Provides the same
 * visual language as the primary PremiumSidebar / TopBar pair.
 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar      from '@mui/material/AppBar';
import Toolbar     from '@mui/material/Toolbar';
import Box         from '@mui/material/Box';
import Typography  from '@mui/material/Typography';
import Button      from '@mui/material/Button';
import IconButton  from '@mui/material/IconButton';
import Tooltip     from '@mui/material/Tooltip';
import Badge       from '@mui/material/Badge';
import Menu        from '@mui/material/Menu';
import MenuItem    from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider     from '@mui/material/Divider';

// Icons — tree-shakeable direct imports
import DashboardRounded   from '@mui/icons-material/Dashboard';
import HubRounded         from '@mui/icons-material/Hub';
import SearchRounded      from '@mui/icons-material/Search';
import ShieldRounded      from '@mui/icons-material/Shield';
import FingerprintRounded from '@mui/icons-material/Fingerprint';
import GavelRounded       from '@mui/icons-material/Gavel';
import NotificationsIcon  from '@mui/icons-material/Notifications';
import PersonIcon         from '@mui/icons-material/Person';
import SettingsIcon       from '@mui/icons-material/Settings';
import ExitToAppIcon      from '@mui/icons-material/ExitToApp';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTenant, setStatus } from '../store/slices/ui';

// ── Color constants (mirrors intelgraphTheme.js DARK palette) ─────────────
const C = {
  topbarBg:      '#090D16',
  borderColor:   'rgba(255,255,255,0.07)',
  textPrimary:   '#E8EEF7',
  textSecondary: '#8B9EC4',
  textMuted:     '#546483',
  primary:       '#3D7EFF',
  activeBg:      'rgba(61,126,255,0.12)',
  hoverBg:       'rgba(255,255,255,0.05)',
} as const;

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',   icon: <DashboardRounded   sx={{ fontSize: 16 }} /> },
  { path: '/graph',       label: 'IntelGraph',  icon: <HubRounded         sx={{ fontSize: 16 }} /> },
  { path: '/investigations', label: 'Cases',    icon: <GavelRounded       sx={{ fontSize: 16 }} /> },
  { path: '/hunts',       label: 'Hunts',       icon: <ShieldRounded      sx={{ fontSize: 16 }} /> },
  { path: '/ioc',         label: 'Indicators',  icon: <FingerprintRounded sx={{ fontSize: 16 }} /> },
  { path: '/search',      label: 'Search',      icon: <SearchRounded      sx={{ fontSize: 16 }} /> },
];

export default function AppHeader() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { tenant } = useAppSelector((s: any) => s.ui);

  const [userAnchor,  setUserAnchor]  = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor:     C.topbarBg,
        borderBottom: `1px solid ${C.borderColor}`,
        boxShadow:   'none',
      }}
    >
      <Toolbar sx={{ minHeight: '48px !important', px: 2, gap: 0.5 }}>
        {/* Wordmark */}
        <Box
          sx={{
            display:    'flex',
            alignItems: 'center',
            gap:        1.25,
            mr:         3,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width:        26,
              height:       26,
              bgcolor:      C.primary,
              borderRadius: '6px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width:        12,
                height:       12,
                bgcolor:      'rgba(255,255,255,0.9)',
                borderRadius: '3px',
                transform:    'rotate(45deg)',
              }}
            />
          </Box>
          <Typography
            sx={{
              fontWeight:    700,
              fontSize:      '15px',
              color:         C.textPrimary,
              letterSpacing: '-0.01em',
            }}
          >
            Summit
          </Typography>
        </Box>

        {/* Primary nav */}
        <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  color:        active ? C.primary : C.textSecondary,
                  bgcolor:      active ? C.activeBg : 'transparent',
                  borderRadius: '7px',
                  px:           1.5,
                  py:           0.625,
                  fontSize:     '12.5px',
                  fontWeight:   active ? 600 : 400,
                  minWidth:     0,
                  '&:hover': {
                    bgcolor: active ? C.activeBg : C.hoverBg,
                    color:   active ? C.primary : C.textPrimary,
                  },
                  '& .MuiButton-startIcon': { marginRight: '5px' },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Notifications */}
          <Tooltip title="Notifications" arrow>
            <IconButton
              size="small"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={{
                color:       C.textMuted,
                borderRadius: '7px',
                '&:hover':   { bgcolor: C.hoverBg, color: C.textSecondary },
              }}
            >
              <Badge
                badgeContent={3}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#EF4444',
                    color:   '#fff',
                    fontSize: '10px',
                    height:  '15px',
                    minWidth: '15px',
                  },
                }}
              >
                <NotificationsIcon sx={{ fontSize: 17 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User menu */}
          <Tooltip title="Account" arrow>
            <IconButton
              size="small"
              onClick={(e) => setUserAnchor(e.currentTarget)}
              sx={{
                color:       C.textMuted,
                borderRadius: '7px',
                '&:hover':   { bgcolor: C.hoverBg, color: C.textSecondary },
              }}
            >
              <PersonIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Notification menu */}
      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={() => setNotifAnchor(null)}
        PaperProps={{ sx: { width: 320, maxHeight: 380 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${C.borderColor}` }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary }}>
            Notifications
          </Typography>
        </Box>
        {[
          { label: 'High-risk IOC detected',    sub: 'APT29 C2 infrastructure identified',   time: '5 min ago',  dot: '#EF4444' },
          { label: 'Hunt completed — findings', sub: 'Suspicious PowerShell activity',         time: '12 min ago', dot: '#F59E0B' },
          { label: 'New investigation assigned', sub: 'Financial fraud case #INV-2025-089',    time: '1 hr ago',   dot: C.primary },
        ].map((n, i) => (
          <MenuItem key={i} sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: n.dot, flexShrink: 0, mt: 0.5 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#C8D4EC', lineHeight: 1.3 }}>
                {n.label}
              </Typography>
              <Typography sx={{ fontSize: '11px', color: C.textMuted, mt: 0.25 }}>
                {n.sub} · {n.time}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setNotifAnchor(null)} sx={{ justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '12px', color: C.primary }}>View all notifications</Typography>
        </MenuItem>
      </Menu>

      {/* User menu */}
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        PaperProps={{ sx: { width: 200 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setUserAnchor(null)}>
          <ListItemIcon><PersonIcon    sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Profile" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
        <MenuItem onClick={() => setUserAnchor(null)}>
          <ListItemIcon><SettingsIcon  sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setUserAnchor(null)}>
          <ListItemIcon><ExitToAppIcon sx={{ fontSize: 16 }} /></ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: '13px' }} />
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
