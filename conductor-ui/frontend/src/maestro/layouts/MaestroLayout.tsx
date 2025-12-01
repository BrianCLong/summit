import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Breadcrumbs,
  Link,
  useTheme,
  CssBaseline,
} from '@mui/material';
import {
  Dashboard,
  Timeline,
  SmartToy, // Robot for Agents
  Autorenew, // Autonomic
  Train, // Merge Train
  Science, // Experiments
  Policy,
  Menu as MenuIcon,
  ChevronLeft,
} from '@mui/icons-material';

const DRAWER_WIDTH = 240;

const MENU_ITEMS = [
  { label: 'Control Room', icon: <Dashboard />, path: '/maestro' },
  { label: 'Runs & Graphs', icon: <Timeline />, path: '/maestro/runs' },
  { label: 'Agents & Models', icon: <SmartToy />, path: '/maestro/agents' },
  { label: 'Autonomic & SLOs', icon: <Autorenew />, path: '/maestro/autonomic' },
  { label: 'Merge Trains', icon: <Train />, path: '/maestro/merge-trains' },
  { label: 'Experiments', icon: <Science />, path: '/maestro/experiments' },
  { label: 'Policy & Audit', icon: <Policy />, path: '/maestro/policy' },
];

export const MaestroLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  const toggleDrawer = () => setOpen(!open);

  const activeItem = MENU_ITEMS.find((item) => {
      if (item.path === '/maestro') return location.pathname === '/maestro';
      return location.pathname.startsWith(item.path);
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            marginLeft: DRAWER_WIDTH,
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Maestro Conductor
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">Operator</Typography>
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main }}>OP</Avatar>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 64,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 64,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar>
            <IconButton onClick={toggleDrawer} sx={{ ml: 'auto' }}>
                <ChevronLeft />
            </IconButton>
        </Toolbar>
        <List>
          {MENU_ITEMS.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  bgcolor: location.pathname === item.path ? theme.palette.action.selected : 'transparent',
                }}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: location.pathname === item.path ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ mb: 3 }}>
             <Breadcrumbs aria-label="breadcrumb">
                <Link underline="hover" color="inherit" onClick={() => navigate('/maestro')}>
                  Maestro
                </Link>
                {activeItem && activeItem.path !== '/maestro' && (
                     <Typography color="text.primary">{activeItem.label}</Typography>
                )}
             </Breadcrumbs>
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
};
