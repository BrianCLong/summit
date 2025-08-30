#!/bin/bash
# Quick UI Setup Script for IntelGraph Client

set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

echo "🎨 Setting up IntelGraph UI..."

cd client

# Create directory structure
mkdir -p src/components/{common,auth,dashboard,graph,investigation}
mkdir -p src/store/slices
mkdir -p src/services
mkdir -p src/styles

# Create main.jsx
cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Create App.jsx
cat > src/App.jsx << 'EOF'
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider, CssBaseline } from '@mui/material';

// Store and Apollo setup
import { store } from './store';
import { apolloClient } from './services/apollo';
import { theme } from './styles/theme';

// Components
import Layout from './components/common/Layout';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import InvestigationPage from './components/investigation/InvestigationPage';
import GraphExplorer from './components/graph/GraphExplorer';
import NotFound from './components/common/NotFound';

function App() {
  useEffect(() => {
    console.log('🚀 IntelGraph Platform Starting...');
  }, []);

  return (
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="investigations" element={<InvestigationPage />} />
                <Route path="graph" element={<GraphExplorer />} />
                <Route path="graph/:id" element={<GraphExplorer />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
EOF

# Create store/index.js
cat > src/store/index.js << 'EOF'
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import graphSlice from './slices/graphSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    graph: graphSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
EOF

# Create authSlice.js
cat > src/store/slices/authSlice.js << 'EOF'
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
EOF

# Create graphSlice.js
cat > src/store/slices/graphSlice.js << 'EOF'
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  layout: {
    name: 'fcose',
    options: {
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 50,
    }
  },
  loading: false,
  error: null,
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setGraphData: (state, action) => {
      state.nodes = action.payload.nodes || [];
      state.edges = action.payload.edges || [];
    },
    addNode: (state, action) => {
      state.nodes.push(action.payload);
    },
    addEdge: (state, action) => {
      state.edges.push(action.payload);
    },
    setSelectedNodes: (state, action) => {
      state.selectedNodes = action.payload;
    },
    setSelectedEdges: (state, action) => {
      state.selectedEdges = action.payload;
    },
    clearGraph: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNodes = [];
      state.selectedEdges = [];
    },
  },
});

export const {
  setGraphData,
  addNode,
  addEdge,
  setSelectedNodes,
  setSelectedEdges,
  clearGraph,
} = graphSlice.actions;

export default graphSlice.reducer;
EOF

# Create uiSlice.js
cat > src/store/slices/uiSlice.js << 'EOF'
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  loading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        n => n.id !== action.payload
      );
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleTheme,
  addNotification,
  removeNotification,
} = uiSlice.actions;

export default uiSlice.reducer;
EOF

# Create apollo.js
cat > src/services/apollo.js << 'EOF'
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
EOF

# Create theme.js
cat > src/styles/theme.js << 'EOF'
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      dark: '#115293',
      light: '#42a5f5',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});
EOF

# Create globals.css
cat > src/styles/globals.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
  background-color: #f5f5f5;
}

#root {
  min-height: 100vh;
}

.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  background-color: #fafafa;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.error-message {
  color: #d32f2f;
  text-align: center;
  padding: 20px;
}
EOF

echo "✅ Created core files and store setup"
echo "🎨 Creating component files..."

# Create Layout.jsx
cat > src/components/common/Layout.jsx << 'EOF'
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
EOF

# Create Dashboard.jsx
cat > src/components/dashboard/Dashboard.jsx << 'EOF'
import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Chip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  TrendingUp, 
  Group, 
  AccountTree,
  Assessment 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: 'Active Investigations', value: '12', icon: <Assessment />, color: 'primary' },
    { label: 'Total Entities', value: '1,247', icon: <Group />, color: 'secondary' },
    { label: 'Relationships', value: '3,891', icon: <AccountTree />, color: 'success' },
    { label: 'This Month', value: '+23%', icon: <TrendingUp />, color: 'info' },
  ];

  const recentInvestigations = [
    { id: 1, title: 'Financial Network Analysis', status: 'active', entities: 45, updated: '2 hours ago' },
    { id: 2, title: 'Supply Chain Investigation', status: 'pending', entities: 78, updated: '5 hours ago' },
    { id: 3, title: 'Communication Pattern Analysis', status: 'completed', entities: 123, updated: '1 day ago' },
    { id: 4, title: 'Geographic Movement Tracking', status: 'active', entities: 34, updated: '2 days ago' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/investigations')}
          size="large"
        >
          New Investigation
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: `${stat.color}.light`,
                    color: `${stat.color}.main`,
                    mr: 2 
                  }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Recent Investigations
          </Typography>
          <Box sx={{ mt: 2 }}>
            {recentInvestigations.map((investigation) => (
              <Box
                key={investigation.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderBottom: '1px solid #eee',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: 'grey.50', cursor: 'pointer' },
                }}
                onClick={() => navigate(`/graph/${investigation.id}`)}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {investigation.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {investigation.entities} entities • Updated {investigation.updated}
                  </Typography>
                </Box>
                <Chip 
                  label={investigation.status} 
                  color={getStatusColor(investigation.status)}
                  size="small"
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Dashboard;
EOF

# Create InvestigationPage.jsx
cat > src/components/investigation/InvestigationPage.jsx << 'EOF'
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  Edit,
  AccountTree
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function InvestigationPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const investigations = [
    {
      id: 1,
      title: 'Financial Network Analysis',
      description: 'Investigating suspicious financial transactions across multiple entities',
      status: 'active',
      priority: 'high',
      entities: 45,
      relationships: 67,
      created: '2024-01-15',
      updated: '2 hours ago'
    },
    {
      id: 2,
      title: 'Supply Chain Investigation',
      description: 'Analyzing supply chain connections and potential fraud indicators',
      status: 'pending',
      priority: 'medium',
      entities: 78,
      relationships: 123,
      created: '2024-01-12',
      updated: '5 hours ago'
    },
    {
      id: 3,
      title: 'Communication Pattern Analysis',
      description: 'Mapping communication networks and identifying key players',
      status: 'completed',
      priority: 'low',
      entities: 123,
      relationships: 234,
      created: '2024-01-08',
      updated: '1 day ago'
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const handleCreateInvestigation = () => {
    console.log('Creating investigation:', newInvestigation);
    setOpenDialog(false);
    setNewInvestigation({ title: '', description: '', priority: 'medium' });
  };

  const filteredInvestigations = investigations.filter(inv =>
    inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Investigations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="large"
        >
          New Investigation
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search investigations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        {filteredInvestigations.map((investigation) => (
          <Grid item xs={12} md={6} lg={4} key={investigation.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {investigation.title}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Chip 
                      label={investigation.status} 
                      color={getStatusColor(investigation.status)}
                      size="small"
                    />
                    <Chip 
                      label={investigation.priority} 
                      color={getPriorityColor(investigation.priority)}
                      size="small"
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {investigation.description}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {investigation.entities} entities
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {investigation.relationships} relationships
                  </Typography>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Updated {investigation.updated}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<AccountTree />}
                    onClick={() => navigate(`/graph/${investigation.id}`)}
                  >
                    View Graph
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    variant="outlined"
                  >
                    Edit
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Investigation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Investigation Title"
            fullWidth
            variant="outlined"
            value={newInvestigation.title}
            onChange={(e) => setNewInvestigation({...newInvestigation, title: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newInvestigation.description}
            onChange={(e) => setNewInvestigation({...newInvestigation, description: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Priority"
            fullWidth
            variant="outlined"
            value={newInvestigation.priority}
            onChange={(e) => setNewInvestigation({...newInvestigation, priority: e.target.value})}
            SelectProps={{
              native: true,
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateInvestigation} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvestigationPage;
EOF

# Create GraphExplorer.jsx
cat > src/components/graph/GraphExplorer.jsx << 'EOF'
import React, { useRef, useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip, 
  Fab,
  Button,
  Alert
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong, 
  Add,
  Save,
  Refresh
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphData, addNode, addEdge } from '../../store/slices/graphSlice';

function GraphExplorer() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const { nodes, edges } = useSelector(state => state.graph);
  const [loading, setLoading] = useState(false);

  const sampleNodes = [
    { id: '1', label: 'John Doe', type: 'PERSON', x: 100, y: 100 },
    { id: '2', label: 'Acme Corp', type: 'ORGANIZATION', x: 300, y: 150 },
    { id: '3', label: 'New York', type: 'LOCATION', x: 200, y: 250 },
    { id: '4', label: 'Document A', type: 'DOCUMENT', x: 400, y: 200 },
  ];

  const sampleEdges = [
    { id: 'e1', source: '1', target: '2', label: 'WORKS_FOR' },
    { id: 'e2', source: '1', target: '3', label: 'LOCATED_AT' },
    { id: 'e3', source: '2', target: '4', label: 'OWNS' },
  ];

  useEffect(() => {
    dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
  }, [dispatch]);

  useEffect(() => {
    if (canvasRef.current && nodes.length > 0) {
      drawGraph();
    }
  }, [nodes, edges]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
        
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, midX, midY - 5);
      }
    });
    
    nodes.forEach(node => {
      const color = getNodeColor(node.type);
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 35);
    });
  };

  const getNodeColor = (type) => {
    const colors = {
      PERSON: '#4caf50',
      ORGANIZATION: '#2196f3',
      LOCATION: '#ff9800',
      DOCUMENT: '#9c27b0',
    };
    return colors[type] || '#9e9e9e';
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node_${Date.now()}`,
      label: `New Entity ${nodes.length + 1}`,
      type: 'PERSON',
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    dispatch(addNode(newNode));
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      dispatch(setGraphData({ nodes: sampleNodes, edges: sampleEdges }));
      setLoading(false);
    }, 1000);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Graph Explorer {id && `- Investigation ${id}`}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Save />}>
            Save
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        This is a basic graph visualization. Click "Add Node" to add entities, or use the zoom controls.
      </Alert>

      <Paper 
        sx={{ 
          flexGrow: 1, 
          position: 'relative', 
          overflow: 'hidden',
          minHeight: 500
        }}
        elevation={2}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa',
          }}
        />
        
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1
        }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center Graph">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>

        <Fab
          color="primary"
          sx={{ position: 'absolute', bottom: 16, right: 16 }}
          onClick={handleAddNode}
        >
          <Add />
        </Fab>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Nodes: {nodes.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Edges: {edges.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {loading ? 'Loading...' : 'Ready'}
        </Typography>
      </Box>
    </Box>
  );
}

export default GraphExplorer;
EOF

# Create LoginPage.jsx
cat > src/components/auth/LoginPage.jsx << 'EOF'
import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (credentials.email && credentials.password) {
      const mockUser = {
        id: '1',
        email: credentials.email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'ANALYST'
      };
      
      dispatch(loginSuccess({
        user: mockUser,
        token: 'demo-token-12345'
      }));
      
      navigate('/dashboard');
    } else {
      setError('Please enter email and password');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: 'grey.100'
    }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          IntelGraph
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Intelligence Analysis Platform
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
          >
            Sign In
          </Button>
        </Box>
        
        <Alert severity="info" sx={{ mt: 3 }}>
          Demo: Enter any email and password to continue
        </Alert>
      </Paper>
    </Box>
  );
}

export default LoginPage;
EOF

# Create NotFound.jsx
cat > src/components/common/NotFound.jsx << 'EOF'
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';

function NotFound() {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center'
    }}>
      <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you're looking for doesn't exist.
      </Typography>
      <Button
        variant="contained"
        startIcon={<Home />}
        onClick={() => navigate('/dashboard')}
      >
        Go Home
      </Button>
    </Box>
  );
}

export default NotFound;
EOF

echo "✅ UI Setup Complete!"
echo ""
echo "🔄 Now restart your Docker containers:"
echo "docker-compose -f docker-compose.dev.yml restart client"
echo ""
echo "🌐 Then visit: http://localhost:3000"
echo ""
echo "🚀 Your IntelGraph Platform is ready with:"
echo "  ✅ Complete React UI with Material-UI"
echo "  ✅ Redux state management"
echo "  ✅ Apollo GraphQL client"
echo "  ✅ Interactive dashboard"
echo "  ✅ Investigation management"
echo "  ✅ Basic graph visualization"
echo "  ✅ Demo authentication"

cd ..
