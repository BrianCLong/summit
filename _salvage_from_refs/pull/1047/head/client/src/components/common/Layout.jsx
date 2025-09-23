import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import { Menu as MenuIcon, Dashboard, AccountTree, Description, Settings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Investigations', icon: <Description />, path: '/investigations' },
  { text: 'Graph Explorer', icon: <AccountTree />, path: '/graph' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

function Layout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector(state => state.ui);

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { sm: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: 'width 0.3s, margin 0.3s',
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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            IntelGraph Platform
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Intelligence Analysis & Graph Analytics
          </Typography>
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
              transition: 'width 0.3s',
            },
          }}
          open={sidebarOpen}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={() => handleNavigation(item.path)}>
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
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
