import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider } from '@mui/material';
import { Menu as MenuIcon, Dashboard, AccountTree, Description, Settings, History, DarkMode, LightMode, Psychology } from '@mui/icons-material';
import { SystemAPI } from '../../services/api';
import { Chip, Tooltip } from '@mui/material';
import AlertsBell from './AlertsBell';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Investigations', icon: <Description />, path: '/investigations' },
  { text: 'Graph Explorer', icon: <AccountTree />, path: '/graph' },
  { text: 'Geo Map', icon: <AccountTree />, path: '/geoint' },
  { text: 'Copilot Goals', icon: <Description />, path: '/copilot' },
  { text: 'AI Analysis', icon: <Psychology />, path: '/ai/analysis' },
  { text: 'AI Suggestions', icon: <Description />, path: '/ai/suggestions' },
  { text: 'Vision', icon: <Description />, path: '/vision' },
  { text: 'Simulation', icon: <Description />, path: '/simulate' },
  { text: 'Sentiment', icon: <Description />, path: '/sentiment' },
  { text: 'External Data', icon: <Description />, path: '/external' },
  { text: 'Reports', icon: <Description />, path: '/reports' },
  { text: 'Activity', icon: <History />, path: '/activity' },
  { text: 'System', icon: <Settings />, path: '/system' },
  { text: 'Instances', icon: <Settings />, path: '/admin/instances' },
  { text: 'Admin Roles', icon: <Settings />, path: '/admin/roles' },
  { text: 'Version History', icon: <History />, path: '/versions' },
];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { sidebarOpen, theme } = useSelector(state => state.ui);
  const [versionInfo, setVersionInfo] = useState(null);
  const [readyStatus, setReadyStatus] = useState({ ready: false, services: {} });

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await SystemAPI.version();
        if (!cancelled) setVersionInfo(info);
      } catch {
        // ignore if backend not reachable
      }
    })();
    const fetchReady = async () => {
      try {
        const status = await SystemAPI.ready();
        if (!cancelled) setReadyStatus(status);
      } catch {
        if (!cancelled) setReadyStatus({ ready: false, services: {} });
      }
    };
    fetchReady();
    const iv = setInterval(fetchReady, 30000);
    return () => { cancelled = true; };
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed"
        color="default"
        sx={{
          width: { sm: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { sm: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: 'width 0.25s, margin 0.25s',
          backgroundColor: 'background.paper',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, letterSpacing: 0.4 }}>
            IntelGraph Platform
          </Typography>
          <AlertsBell />
          <Tooltip title={`Services: ${Object.entries(readyStatus.services || {}).map(([k,v])=>`${k}:${v}`).join(', ') || 'unknown'}`}>
            <Chip 
              size="small" 
              label={readyStatus.ready ? 'Ready' : 'Degraded'} 
              color={readyStatus.ready ? 'success' : 'warning'} 
              sx={{ mr: 2 }}
            />
          </Tooltip>
          {versionInfo && (
            <Typography variant="caption" sx={{ mr: 2, opacity: 0.8 }}>
              {versionInfo.name} v{versionInfo.version}
            </Typography>
          )}
          <IconButton
            aria-label="Toggle color scheme"
            color="inherit"
            onClick={() => dispatch(toggleTheme())}
            sx={{ ml: 1 }}
          >
            {theme === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: sidebarOpen ? DRAWER_WIDTH : 0 }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="persistent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              transition: 'width 0.25s',
            },
          }}
          open={sidebarOpen}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider />
          </Box>
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          transition: 'width 0.3s',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
