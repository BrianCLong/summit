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
// Direct icon imports for tree-shaking (reduces bundle size)
import Dashboard from '@mui/icons-material/Dashboard';
import AccountTree from '@mui/icons-material/AccountTree';
import Search from '@mui/icons-material/Search';
import Security from '@mui/icons-material/Security';
import Gavel from '@mui/icons-material/Gavel';
import Notifications from '@mui/icons-material/Notifications';
import Settings from '@mui/icons-material/Settings';
import ExitToApp from '@mui/icons-material/ExitToApp';
import Person from '@mui/icons-material/Person';
import Timeline from '@mui/icons-material/Timeline';
import Assessment from '@mui/icons-material/Assessment';
import OpenInNew from '@mui/icons-material/OpenInNew';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTenant, setStatus } from '../store/slices/ui';
import { getGrafanaUrl, getJaegerUrl } from '../config/urls';

export default function AppHeader() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, status } = useAppSelector((s: any) => s.ui);
  const grafanaUrl = getGrafanaUrl();
  const jaegerUrl = getJaegerUrl();
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
              component="a"
              href={grafanaUrl || '#'}
              target="_blank"
              rel="noreferrer"
              sx={{ color: 'text.primary' }}
              disabled={!grafanaUrl}
            >
              <Assessment />
            </IconButton>
          </Tooltip>

          <Tooltip title="Jaeger Tracing">
            <IconButton
              component="a"
              href={jaegerUrl || '#'}
              target="_blank"
              rel="noreferrer"
              sx={{ color: 'text.primary' }}
              disabled={!jaegerUrl}
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
