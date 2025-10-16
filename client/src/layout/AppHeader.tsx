import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import {
  Dashboard,
  AccountTree,
  Search,
  Security,
  Gavel,
  Notifications,
  Settings,
  ExitToApp,
  Person,
  Timeline,
  Assessment,
  OpenInNew,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/index.ts';
import { setTenant, setStatus } from '../store/slices/ui.ts';

export default function AppHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, status } = useAppSelector((s) => s.ui);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [notificationsAnchor, setNotificationsAnchor] =
    useState<null | HTMLElement>(null);

  const navigationItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      color: 'inherit',
    },
    { path: '/graph', label: 'Graph', icon: <AccountTree />, color: 'inherit' },
    {
      path: '/investigations',
      label: 'Cases',
      icon: <Gavel />,
      color: 'inherit',
    },
    { path: '/hunts', label: 'Hunts', icon: <Security />, color: 'inherit' },
    { path: '/ioc', label: 'IOCs', icon: <Timeline />, color: 'inherit' },
    { path: '/search', label: 'Search', icon: <Search />, color: 'inherit' },
  ];

  const isActivePath = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <AppBar
      position="static"
      sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
      elevation={1}
    >
      <Toolbar>
        <Typography
          variant="h5"
          sx={{
            flexGrow: 0,
            mr: 4,
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          IntelGraph
        </Typography>

        {/* Main Navigation */}
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              startIcon={item.icon}
              onClick={() => handleNavigate(item.path)}
              sx={{
                color: isActivePath(item.path)
                  ? 'primary.main'
                  : 'text.primary',
                bgcolor: isActivePath(item.path)
                  ? 'primary.light'
                  : 'transparent',
                '&:hover': {
                  bgcolor: isActivePath(item.path)
                    ? 'primary.light'
                    : 'action.hover',
                },
                borderRadius: 2,
                px: 2,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Controls Section */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tenant</InputLabel>
            <Select
              value={tenant}
              label="Tenant"
              onChange={(e) => dispatch(setTenant(e.target.value))}
              sx={{ bgcolor: 'background.default' }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="tenant-a">Tenant A</MenuItem>
              <MenuItem value="tenant-b">Tenant B</MenuItem>
              <MenuItem value="dev">Development</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => dispatch(setStatus(e.target.value))}
              sx={{ bgcolor: 'background.default' }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
            </Select>
          </FormControl>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              onClick={(e) => setNotificationsAnchor(e.currentTarget)}
              sx={{ color: 'text.primary' }}
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* External Tools */}
          <Tooltip title="Grafana Dashboard">
            <IconButton
              href={
                import.meta.env.VITE_GRAFANA_URL ||
                'http://localhost:3000/grafana'
              }
              target="_blank"
              rel="noreferrer"
              sx={{ color: 'text.primary' }}
            >
              <Assessment />
            </IconButton>
          </Tooltip>

          <Tooltip title="Jaeger Tracing">
            <IconButton
              href={import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686'}
              target="_blank"
              rel="noreferrer"
              sx={{ color: 'text.primary' }}
            >
              <OpenInNew />
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="User Profile">
            <IconButton
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ color: 'text.primary' }}
            >
              <Person />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchor}
          open={Boolean(notificationsAnchor)}
          onClose={() => setNotificationsAnchor(null)}
          PaperProps={{
            sx: { width: 320, maxHeight: 400 },
          }}
        >
          <MenuItem>
            <ListItemIcon>
              <Security color="error" />
            </ListItemIcon>
            <ListItemText
              primary="High-risk IOC detected"
              secondary="APT29 C2 infrastructure identified - 5 minutes ago"
            />
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <Timeline color="warning" />
            </ListItemIcon>
            <ListItemText
              primary="Hunt completed with findings"
              secondary="Suspicious PowerShell activity - 12 minutes ago"
            />
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <Gavel color="info" />
            </ListItemIcon>
            <ListItemText
              primary="New investigation assigned"
              secondary="Financial fraud case #INV-2025-089 - 1 hour ago"
            />
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setNotificationsAnchor(null)}>
            <ListItemText
              primary="View All Notifications"
              sx={{ textAlign: 'center' }}
            />
          </MenuItem>
        </Menu>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          PaperProps={{
            sx: { width: 200 },
          }}
        >
          <MenuItem onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon>
              <Person />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </MenuItem>
          <MenuItem onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
