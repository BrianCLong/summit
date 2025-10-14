import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Fab,
  Collapse,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
  Slide,
  Fade,
  Hidden,
  Container,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountTree,
  Psychology,
  Analytics,
  Settings,
  Person,
  Notifications,
  Help,
  ExitToApp,
  KeyboardArrowUp,
  DarkMode,
  LightMode,
  Contrast,
  Accessibility,
  VolumeUp,
  VolumeOff,
  ZoomIn,
  ZoomOut,
  Search,
  ExpandLess,
  ExpandMore,
  Home,
  Description,
  Group,
  Security,
  Timeline,
  Map,
  Chat,
  Bookmark,
  CloudDownload
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useResponsive, useAccessibility } from '../../theme/ThemeProvider';

const DRAWER_WIDTH = 280;
const MINI_DRAWER_WIDTH = 56;

function ResponsiveLayout({ children }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { announce, announcements, prefersReducedMotion } = useAccessibility();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [miniDrawer, setMiniDrawer] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [accessibilityPanelOpen, setAccessibilityPanelOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'New analysis complete', message: 'Graph centrality analysis finished', type: 'info', unread: true },
    { id: 2, title: 'Anomaly detected', message: 'Unusual pattern found in network', type: 'warning', unread: true },
    { id: 3, title: 'Investigation updated', message: 'Case #INV-001 has new evidence', type: 'success', unread: false }
  ]);

  const mainRef = useRef(null);
  const skipLinkRef = useRef(null);

  // Redux state
  const { user } = useSelector(state => state.auth || {});
  const { darkMode } = useSelector(state => state.ui || {});

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setShowScrollTop(mainRef.current.scrollTop > 300);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    // Close mobile drawer when route changes
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Navigation items with accessibility labels
  const navigationItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <Dashboard />, 
      path: '/dashboard',
      ariaLabel: 'Go to main dashboard'
    },
    { 
      id: 'investigations', 
      label: 'Investigations', 
      icon: <Search />, 
      path: '/investigations',
      ariaLabel: 'View and manage investigations'
    },
    { 
      id: 'graph', 
      label: 'Graph Explorer', 
      icon: <AccountTree />, 
      path: '/graph',
      ariaLabel: 'Explore network graphs'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: <Analytics />, 
      path: '/analytics',
      ariaLabel: 'View analytics and reports'
    },
    { 
      id: 'ai-insights', 
      label: 'AI Insights', 
      icon: <Psychology />, 
      path: '/ai-insights',
      ariaLabel: 'Access AI-powered insights'
    }
  ];

  const toolsItems = [
    { 
      id: 'timeline', 
      label: 'Timeline', 
      icon: <Timeline />, 
      path: '/timeline',
      ariaLabel: 'View timeline analysis'
    },
    { 
      id: 'geospatial', 
      label: 'Geospatial', 
      icon: <Map />, 
      path: '/geospatial',
      ariaLabel: 'Access geospatial tools'
    },
    { 
      id: 'collaboration', 
      label: 'Collaboration', 
      icon: <Chat />, 
      path: '/collaboration',
      ariaLabel: 'Collaborate with team members'
    },
    { 
      id: 'documents', 
      label: 'Documents', 
      icon: <Description />, 
      path: '/documents',
      ariaLabel: 'Manage documents and files'
    }
  ];

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
      announce(mobileOpen ? 'Navigation closed' : 'Navigation opened');
    } else {
      setDesktopOpen(!desktopOpen);
      announce(desktopOpen ? 'Sidebar collapsed' : 'Sidebar expanded');
    }
  };

  const handleNavigate = (path, label) => {
    navigate(path);
    announce(`Navigated to ${label}`);
  };

  const handleScrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      announce('Scrolled to top');
    }
  };

  const toggleDarkMode = () => {
    // dispatch(toggleDarkMode());
    announce(darkMode ? 'Switched to light mode' : 'Switched to dark mode');
  };

  const DrawerContent = ({ variant = 'permanent' }) => (
    <Box
      sx={{ 
        width: variant === 'temporary' ? DRAWER_WIDTH : (miniDrawer ? MINI_DRAWER_WIDTH : DRAWER_WIDTH),
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo/Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minHeight: 64
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 40,
            height: 40
          }}
        >
          IG
        </Avatar>
        {(!miniDrawer || variant === 'temporary') && (
          <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold' }}>
            IntelGraph
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List
          subheader={
            (!miniDrawer || variant === 'temporary') && (
              <Typography variant="overline" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                Main
              </Typography>
            )
          }
        >
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path, item.label)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }
                }}
                aria-label={item.ariaLabel}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                    minWidth: miniDrawer && variant !== 'temporary' ? 'auto' : 56
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!miniDrawer || variant === 'temporary') && (
                  <ListItemText primary={item.label} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 1 }} />

        <List
          subheader={
            (!miniDrawer || variant === 'temporary') && (
              <Typography variant="overline" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                Tools
              </Typography>
            )
          }
        >
          {toolsItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path, item.label)}
                sx={{
                  mx: 1,
                  borderRadius: 1
                }}
                aria-label={item.ariaLabel}
              >
                <ListItemIcon
                  sx={{
                    color: 'text.secondary',
                    minWidth: miniDrawer && variant !== 'temporary' ? 'auto' : 56
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!miniDrawer || variant === 'temporary') && (
                  <ListItemText primary={item.label} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Settings and User */}
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setAccessibilityPanelOpen(true)}
            sx={{ mx: 1, borderRadius: 1 }}
            aria-label="Open accessibility settings"
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <Accessibility />
            </ListItemIcon>
            {(!miniDrawer || variant === 'temporary') && (
              <ListItemText primary="Accessibility" />
            )}
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigate('/settings', 'Settings')}
            sx={{ mx: 1, borderRadius: 1 }}
            aria-label="Open settings"
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <Settings />
            </ListItemIcon>
            {(!miniDrawer || variant === 'temporary') && (
              <ListItemText primary="Settings" />
            )}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Skip to main content link for screen readers */}
      <Box
        ref={skipLinkRef}
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          top: -40,
          left: 6,
          zIndex: 9999,
          px: 2,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          textDecoration: 'none',
          '&:focus': {
            top: 6
          }
        }}
        onFocus={() => announce('Skip to main content link focused')}
      >
        Skip to main content
      </Box>

      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: {
            sm: isMobile ? '100%' : `calc(100% - ${desktopOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`
          },
          ml: {
            sm: isMobile ? 0 : (desktopOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH)
          },
          zIndex: theme.zIndex.drawer + 1
        }}
        elevation={1}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="Toggle navigation menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            IntelGraph Platform
          </Typography>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isMobile && (
              <>
                <Tooltip title="Toggle dark mode">
                  <IconButton
                    color="inherit"
                    onClick={toggleDarkMode}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Notifications">
                  <IconButton
                    color="inherit"
                    onClick={(e) => setNotificationsAnchor(e.currentTarget)}
                    aria-label="View notifications"
                  >
                    <Badge badgeContent={notifications.filter(n => n.unread).length} color="error">
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </>
            )}

            {/* User Menu */}
            <Tooltip title="User menu">
              <IconButton
                color="inherit"
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                aria-label="Open user menu"
              >
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                >
                  {user?.firstName?.[0] || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: desktopOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: desktopOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              overflowX: 'hidden'
            }
          }}
          open={desktopOpen}
        >
          <DrawerContent />
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box'
            }
          }}
        >
          <DrawerContent variant="temporary" />
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        ref={mainRef}
        id="main-content"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          height: '100vh',
          pt: 8, // Account for AppBar
          backgroundColor: 'background.default'
        }}
        tabIndex={-1} // Make focusable for skip link
      >
        <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>

        {/* Scroll to Top FAB */}
        <Fade in={showScrollTop}>
          <Fab
            color="primary"
            size="small"
            aria-label="Scroll to top"
            onClick={handleScrollToTop}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: theme.zIndex.speedDial
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Fade>
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleNavigate('/profile', 'Profile')}>
          <ListItemIcon><Person fontSize="small" /></ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/settings', 'Settings')}>
          <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {/* Logout logic */}}>
          <ListItemIcon><ExitToApp fontSize="small" /></ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchor}
        open={Boolean(notificationsAnchor)}
        onClose={() => setNotificationsAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />
        {notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ whiteSpace: 'normal', py: 1.5 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {notification.title}
                </Typography>
                {notification.unread && (
                  <Chip label="New" size="small" color="primary" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {notification.message}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Accessibility Panel */}
      <Drawer
        anchor="right"
        open={accessibilityPanelOpen}
        onClose={() => setAccessibilityPanelOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 300 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Accessibility Settings
          </Typography>
          
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
            label="Dark Mode"
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="outlined"
            startIcon={<ZoomIn />}
            sx={{ mb: 1 }}
            onClick={() => {
              document.body.style.fontSize = '110%';
              announce('Text size increased');
            }}
          >
            Increase Text Size
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<ZoomOut />}
            sx={{ mb: 1 }}
            onClick={() => {
              document.body.style.fontSize = '100%';
              announce('Text size reset');
            }}
          >
            Reset Text Size
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<Contrast />}
            sx={{ mb: 2 }}
            onClick={() => announce('High contrast mode toggled')}
          >
            Toggle High Contrast
          </Button>

          <Typography variant="body2" color="text.secondary">
            Use keyboard shortcuts: Tab to navigate, Enter to select, Escape to close dialogs.
          </Typography>
        </Box>
      </Drawer>

      {/* Live Announcements for Screen Readers */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden'
        }}
      >
        {announcements.map((announcement) => (
          <div key={announcement.id}>
            {announcement.message}
          </div>
        ))}
      </Box>
    </Box>
  );
}

export default ResponsiveLayout;