import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountTree,
  Description,
  Settings,
  EmojiObjects,
} from '@mui/icons-material';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Investigations', icon: <Description />, path: '/investigations' },
  { text: 'Graph Explorer', icon: <AccountTree />, path: '/graph' },
  { text: 'Engagement Studio', icon: <EmojiObjects />, path: '/activities' },
  { text: 'Settings', icon: <Settings />, path: '/settings', disabled: true },
];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    dispatch(toggleSidebar());
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          IntelGraph
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => {
                if (!item.disabled) {
                  navigate(item.path);
                  setMobileOpen(false);
                }
              }}
              disabled={item.disabled}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Secure. Explainable. Mission-ready.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Intelligence Operations Console
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: sidebarOpen ? DRAWER_WIDTH : 72,
              transition: 'width 0.3s',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            sm: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          transition: 'width 0.3s',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
