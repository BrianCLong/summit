"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroLayout = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const DRAWER_WIDTH = 240;
const MENU_ITEMS = [
    { label: 'Control Room', icon: <icons_material_1.Dashboard />, path: '/maestro' },
    { label: 'Runs & Graphs', icon: <icons_material_1.Timeline />, path: '/maestro/runs' },
    { label: 'Agents & Models', icon: <icons_material_1.SmartToy />, path: '/maestro/agents' },
    { label: 'Autonomic & SLOs', icon: <icons_material_1.Autorenew />, path: '/maestro/autonomic' },
    { label: 'Merge Trains', icon: <icons_material_1.Train />, path: '/maestro/merge-trains' },
    { label: 'Experiments', icon: <icons_material_1.Science />, path: '/maestro/experiments' },
    { label: 'Policy & Audit', icon: <icons_material_1.Policy />, path: '/maestro/policy' },
];
const MaestroLayout = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const theme = (0, material_1.useTheme)();
    const [open, setOpen] = (0, react_1.useState)(true);
    const toggleDrawer = () => setOpen(!open);
    const activeItem = MENU_ITEMS.find((item) => {
        if (item.path === '/maestro')
            return location.pathname === '/maestro';
        return location.pathname.startsWith(item.path);
    });
    return (<material_1.Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <material_1.CssBaseline />
      <material_1.AppBar position="fixed" sx={{
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
        }}>
        <material_1.Toolbar>
          <material_1.IconButton color="inherit" aria-label="open drawer" onClick={toggleDrawer} edge="start" sx={{
            marginRight: 5,
            ...(open && { display: 'none' }),
        }}>
            <icons_material_1.Menu />
          </material_1.IconButton>
          <material_1.Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Maestro Conductor
          </material_1.Typography>
          <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <material_1.Typography variant="body2">Operator</material_1.Typography>
            <material_1.Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main }}>OP</material_1.Avatar>
          </material_1.Box>
        </material_1.Toolbar>
      </material_1.AppBar>
      <material_1.Drawer variant="permanent" open={open} sx={{
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
        }}>
        <material_1.Toolbar>
            <material_1.IconButton onClick={toggleDrawer} sx={{ ml: 'auto' }}>
                <icons_material_1.ChevronLeft />
            </material_1.IconButton>
        </material_1.Toolbar>
        <material_1.List>
          {MENU_ITEMS.map((item) => (<material_1.ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <material_1.ListItemButton sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                bgcolor: location.pathname === item.path ? theme.palette.action.selected : 'transparent',
            }} onClick={() => navigate(item.path)}>
                <material_1.ListItemIcon sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: location.pathname === item.path ? theme.palette.primary.main : 'inherit',
            }}>
                  {item.icon}
                </material_1.ListItemIcon>
                <material_1.ListItemText primary={item.label} sx={{ opacity: open ? 1 : 0 }}/>
              </material_1.ListItemButton>
            </material_1.ListItem>))}
        </material_1.List>
      </material_1.Drawer>
      <material_1.Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <material_1.Toolbar /> {/* Spacer for AppBar */}
        <material_1.Box sx={{ mb: 3 }}>
             <material_1.Breadcrumbs aria-label="breadcrumb">
                <material_1.Link underline="hover" color="inherit" onClick={() => navigate('/maestro')}>
                  Maestro
                </material_1.Link>
                {activeItem && activeItem.path !== '/maestro' && (<material_1.Typography color="text.primary">{activeItem.label}</material_1.Typography>)}
             </material_1.Breadcrumbs>
        </material_1.Box>
        <react_router_dom_1.Outlet />
      </material_1.Box>
    </material_1.Box>);
};
exports.MaestroLayout = MaestroLayout;
