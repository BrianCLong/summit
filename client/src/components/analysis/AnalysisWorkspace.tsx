import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Grid,
  IconButton,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Fab,
  Popover,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemButton,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Dashboard as DashboardIcon,
  ViewList as ListViewIcon,
  LinkOff as LinkOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon,
  GridOn as GridLayoutIcon,
  ViewColumn as ColumnLayoutIcon,
  ViewComfy as ComfyLayoutIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAccessibility } from '../../design-system/accessibility/AccessibilityContext';
import { buildDesignSystemTheme } from '../../design-system/theme';
import { lightTokens } from '../../design-system/tokens';

// Types
interface WorkspaceLayout {
  id: string;
  name: string;
  description?: string;
  components: LayoutComponent[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  sharedWith: string[];
  isPublic: boolean;
  tags: string[];
}

interface LayoutComponent {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;
  linked: boolean;
  linkedTo: string[];
}

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'idle' | 'offline';
  lastSeen: Date;
  cursor?: {
    x: number;
    y: number;
  };
}

interface WorkspaceLink {
  id: string;
  sourceComponentId: string;
  targetComponentId: string;
  type: 'evidence' | 'finding' | 'relationship' | 'timeline';
  description?: string;
  createdAt: Date;
  createdBy: string;
}

interface AnalysisWorkspaceProps {
  userId: string;
  userName: string;
  userEmail: string;
  onWorkspaceChange?: (workspace: WorkspaceLayout) => void;
  initialWorkspace?: WorkspaceLayout;
  className?: string;
}

// Component
const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({
  userId,
  userName,
  userEmail,
  onWorkspaceChange,
  initialWorkspace,
  className = '',
}) => {
  const theme = useTheme();
  const { keyboardNavigation } = useAccessibility();
  const [workspaces, setWorkspaces] = useState<WorkspaceLayout[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceLayout | null>(null);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [selectedComponentForLink, setSelectedComponentForLink] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<Partial<WorkspaceLink> | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showLinks, setShowLinks] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'flex' | 'free'>('grid');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [collaborators, setCollaborators] = useState<WorkspaceUser[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<WorkspaceUser[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenu, setContextMenu] = useState<{ anchorPoint: { x: number; y: number }; componentId: string | null } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Initialize with initial workspace if provided
  useEffect(() => {
    if (initialWorkspace) {
      setCurrentWorkspace(initialWorkspace);
    } else {
      // Create a default workspace
      const defaultWorkspace: WorkspaceLayout = {
        id: `workspace-${Date.now()}`,
        name: 'New Analysis Workspace',
        description: 'A new analysis workspace',
        components: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        sharedWith: [],
        isPublic: false,
        tags: [],
      };
      setCurrentWorkspace(defaultWorkspace);
    }
  }, [initialWorkspace, userId]);

  // Mock data for demonstration
  useEffect(() => {
    // Mock workspaces
    const mockWorkspaces: WorkspaceLayout[] = [
      {
        id: 'workspace-1',
        name: 'Threat Analysis Workspace',
        description: 'Analysis of recent threat patterns',
        components: [
          {
            id: 'comp-1',
            type: 'graph',
            title: 'Threat Graph',
            position: { x: 0, y: 0 },
            size: { width: 40, height: 30 },
            props: { data: 'threat-data' },
            linked: false,
            linkedTo: [],
          },
          {
            id: 'comp-2',
            type: 'timeline',
            title: 'Incident Timeline',
            position: { x: 45, y: 0 },
            size: { width: 30, height: 30 },
            props: { data: 'timeline-data' },
            linked: false,
            linkedTo: [],
          },
          {
            id: 'comp-3',
            type: 'table',
            title: 'IOC Table',
            position: { x: 0, y: 35 },
            size: { width: 75, height: 30 },
            props: { data: 'ioc-data' },
            linked: false,
            linkedTo: [],
          },
        ],
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
        userId: 'user-1',
        sharedWith: ['user-2', 'user-3'],
        isPublic: false,
        tags: ['threat', 'analysis', 'ioc'],
      },
      {
        id: 'workspace-2',
        name: 'Campaign Investigation',
        description: 'Analysis of APT campaign',
        components: [
          {
            id: 'comp-4',
            type: 'graph',
            title: 'Campaign Graph',
            position: { x: 0, y: 0 },
            size: { width: 50, height: 40 },
            props: { data: 'campaign-data' },
            linked: false,
            linkedTo: [],
          },
          {
            id: 'comp-5',
            type: 'map',
            title: 'Geographic Spread',
            position: { x: 55, y: 0 },
            size: { width: 40, height: 40 },
            props: { data: 'geo-data' },
            linked: false,
            linkedTo: [],
          },
        ],
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 3600000),
        userId: 'user-1',
        sharedWith: ['user-2'],
        isPublic: false,
        tags: ['campaign', 'apt', 'geographic'],
      },
    ];
    setWorkspaces(mockWorkspaces);
    
    // Mock collaborators
    const mockCollaborators: WorkspaceUser[] = [
      {
        id: 'user-1',
        name: userName,
        email: userEmail,
        role: 'admin',
        status: 'active',
        lastSeen: new Date(),
      },
      {
        id: 'user-2',
        name: 'Sarah Chen',
        email: 'sarah.chen@intelgraph.com',
        role: 'analyst',
        status: 'active',
        lastSeen: new Date(Date.now() - 300000),
      },
      {
        id: 'user-3',
        name: 'Alex Rodriguez',
        email: 'alex.rodriguez@intelgraph.com',
        role: 'viewer',
        status: 'idle',
        lastSeen: new Date(Date.now() - 900000),
      },
    ];
    setCollaborators(mockCollaborators);
    setActiveCollaborators(mockCollaborators.filter(user => user.status === 'active'));
  }, [userName, userEmail]);

  // Handle adding a new component
  const handleAddComponent = useCallback(() => {
    if (!currentWorkspace) return;
    
    const newComponent: LayoutComponent = {
      id: `comp-${Date.now()}`,
      type: 'graph',
      title: 'New Component',
      position: { x: 10, y: 10 },
      size: { width: 30, height: 20 },
      props: {},
      linked: false,
      linkedTo: [],
    };
    
    const updatedWorkspace = {
      ...currentWorkspace,
      components: [...currentWorkspace.components, newComponent],
      updatedAt: new Date(),
    };
    
    setCurrentWorkspace(updatedWorkspace);
    onWorkspaceChange?.(updatedWorkspace);
  }, [currentWorkspace, onWorkspaceChange]);

  // Handle deleting a component
  const handleDeleteComponent = useCallback((componentId: string) => {
    if (!currentWorkspace) return;
    
    const updatedComponents = currentWorkspace.components.filter(comp => comp.id !== componentId);
    const updatedLinks = currentWorkspace.components.map(comp => ({
      ...comp,
      linkedTo: comp.linkedTo.filter(id => id !== componentId)
    }));
    
    const updatedWorkspace = {
      ...currentWorkspace,
      components: updatedLinks,
      updatedAt: new Date(),
    };
    
    setCurrentWorkspace(updatedWorkspace);
    onWorkspaceChange?.(updatedWorkspace);
  }, [currentWorkspace, onWorkspaceChange]);

  // Handle saving workspace
  const handleSaveWorkspace = useCallback(() => {
    setIsSaveDialogOpen(true);
  }, []);

  // Handle loading workspace
  const handleLoadWorkspace = useCallback(() => {
    setIsLoadDialogOpen(true);
  }, []);

  // Handle workspace save dialog submit
  const handleSaveSubmit = useCallback((name: string, description: string, tags: string[]) => {
    if (!currentWorkspace) return;
    
    const updatedWorkspace = {
      ...currentWorkspace,
      name,
      description,
      tags,
      updatedAt: new Date(),
    };
    
    // In a real implementation, this would save to a backend
    setWorkspaces(prev => {
      const existingIndex = prev.findIndex(ws => ws.id === currentWorkspace.id);
      if (existingIndex >= 0) {
        const newWorkspaces = [...prev];
        newWorkspaces[existingIndex] = updatedWorkspace;
        return newWorkspaces;
      } else {
        return [...prev, updatedWorkspace];
      }
    });
    
    setCurrentWorkspace(updatedWorkspace);
    onWorkspaceChange?.(updatedWorkspace);
    setIsSaveDialogOpen(false);
  }, [currentWorkspace, onWorkspaceChange]);

  // Handle workspace load
  const handleWorkspaceLoad = useCallback((workspaceId: string) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      setIsLoadDialogOpen(false);
    }
  }, [workspaces]);

  // Handle linking components
  const handleStartLinking = useCallback((componentId: string) => {
    if (!selectedComponentForLink) {
      setSelectedComponentForLink(componentId);
      setIsLinkingMode(true);
    } else if (selectedComponentForLink !== componentId) {
      // Create link between selectedComponentForLink and componentId
      if (currentWorkspace) {
        const updatedComponents = currentWorkspace.components.map(comp => {
          if (comp.id === selectedComponentForLink) {
            return {
              ...comp,
              linked: true,
              linkedTo: [...comp.linkedTo, componentId]
            };
          } else if (comp.id === componentId) {
            return {
              ...comp,
              linked: true,
              linkedTo: [...comp.linkedTo, selectedComponentForLink]
            };
          }
          return comp;
        });
        
        const updatedWorkspace = {
          ...currentWorkspace,
          components: updatedComponents,
          updatedAt: new Date(),
        };
        
        setCurrentWorkspace(updatedWorkspace);
        onWorkspaceChange?.(updatedWorkspace);
      }
      setSelectedComponentForLink(null);
      setIsLinkingMode(false);
    }
  }, [selectedComponentForLink, currentWorkspace, onWorkspaceChange]);

  // Handle removing a link
  const handleRemoveLink = useCallback((sourceId: string, targetId: string) => {
    if (currentWorkspace) {
      const updatedComponents = currentWorkspace.components.map(comp => {
        if (comp.id === sourceId) {
          return {
            ...comp,
            linkedTo: comp.linkedTo.filter(id => id !== targetId)
          };
        } else if (comp.id === targetId) {
          return {
            ...comp,
            linkedTo: comp.linkedTo.filter(id => id !== sourceId)
          };
        }
        return comp;
      });
      
      const updatedWorkspace = {
        ...currentWorkspace,
        components: updatedComponents,
        updatedAt: new Date(),
      };
      
      setCurrentWorkspace(updatedWorkspace);
      onWorkspaceChange?.(updatedWorkspace);
    }
  }, [currentWorkspace, onWorkspaceChange]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, componentId: string) => {
    e.preventDefault();
    setContextMenu({
      anchorPoint: { x: e.clientX, y: e.clientY },
      componentId
    });
  }, []);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle component context menu actions
  const handleComponentAction = useCallback((action: string) => {
    if (!contextMenu?.componentId) return;
    
    switch (action) {
      case 'delete':
        handleDeleteComponent(contextMenu.componentId);
        break;
      case 'unlink':
        // Remove all links for this component
        if (currentWorkspace) {
          const component = currentWorkspace.components.find(c => c.id === contextMenu.componentId);
          if (component) {
            component.linkedTo.forEach(targetId => {
              handleRemoveLink(component.id, targetId);
            });
          }
        }
        break;
      case 'duplicate':
        // Duplicate the component
        if (currentWorkspace) {
          const component = currentWorkspace.components.find(c => c.id === contextMenu.componentId);
          if (component) {
            const newComponent: LayoutComponent = {
              ...component,
              id: `comp-${Date.now()}`,
              position: { 
                x: component.position.x + 5, 
                y: component.position.y + 5 
              }
            };
            
            const updatedWorkspace = {
              ...currentWorkspace,
              components: [...currentWorkspace.components, newComponent],
              updatedAt: new Date(),
            };
            
            setCurrentWorkspace(updatedWorkspace);
            onWorkspaceChange?.(updatedWorkspace);
          }
        }
        break;
    }
    
    handleContextMenuClose();
  }, [contextMenu, handleDeleteComponent, handleRemoveLink, currentWorkspace, onWorkspaceChange, handleContextMenuClose]);

  // Filter components based on search term
  const filteredComponents = useMemo(() => {
    if (!searchTerm) return currentWorkspace?.components || [];
    return (currentWorkspace?.components || []).filter(comp => 
      comp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentWorkspace, searchTerm]);

  // Render component based on type
  const renderComponent = useCallback((component: LayoutComponent) => {
    // This would render actual components based on type
    // For demo purposes, we'll render a placeholder
    return (
      <Paper 
        elevation={2}
        sx={{ 
          height: '100%', 
          p: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
          border: isLinkingMode ? '2px dashed #3B82F6' : '1px solid #E2E8F0',
          cursor: isLinkingMode ? 'pointer' : 'default',
          '&:hover': {
            border: isLinkingMode ? '2px dashed #2563EB' : '1px solid #CBD5E1',
            backgroundColor: isLinkingMode ? '#F0F9FF' : theme.palette.action.hover,
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, component.id)}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1,
          borderBottom: '1px solid #E2E8F0',
          pb: 0.5
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {component.title}
          </Typography>
          <Box>
            {component.linked && (
              <Tooltip title="Component is linked to other components">
                <LinkIcon fontSize="small" sx={{ color: '#10B981', ml: 0.5 }} />
              </Tooltip>
            )}
            <IconButton 
              size="small" 
              onClick={() => handleStartLinking(component.id)}
              sx={{ ml: 0.5 }}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          borderRadius: 1
        }}>
          <Typography variant="caption" color="text.secondary">
            {component.type} component
          </Typography>
        </Box>
      </Paper>
    );
  }, [theme, isLinkingMode, handleContextMenu, handleStartLinking]);

  // Render the workspace
  return (
    <Box 
      className={`analysis-workspace ${className}`}
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Analysis Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentWorkspace?.name || 'Untitled Workspace'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Collaborators indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {activeCollaborators.slice(0, 3).map((user, index) => (
              <Tooltip key={user.id} title={`${user.name} (${user.status})`}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : '#8B5CF6',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                    marginLeft: index > 0 ? '-8px' : '0',
                  }}
                >
                  {user.name.charAt(0)}
                </Box>
              </Tooltip>
            ))}
            {activeCollaborators.length > 3 && (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  marginLeft: '-8px',
                }}
              >
                +{activeCollaborators.length - 3}
              </Box>
            )}
          </Box>
          
          <TextField
            size="small"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              sx: { fontSize: '0.8rem' }
            }}
          />
          
          <IconButton onClick={handleLoadWorkspace} title="Load Workspace">
            <RestoreIcon />
          </IconButton>
          
          <IconButton onClick={handleSaveWorkspace} title="Save Workspace">
            <SaveIcon />
          </IconButton>
          
          <IconButton onClick={() => setIsSettingsOpen(true)} title="Workspace Settings">
            <SettingsIcon />
          </IconButton>
          
          <IconButton onClick={() => setIsSharingOpen(true)} title="Share Workspace">
            <ShareIcon />
          </IconButton>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddComponent}
          >
            Add Component
          </Button>
        </Box>
      </Box>
      
      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Sidebar */}
        <Box 
          sx={{ 
            width: 280, 
            borderRight: '1px solid', 
            borderColor: 'divider',
            backgroundColor: theme.palette.background.paper,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="Components" />
            <Tab label="Links" />
            <Tab label="History" />
          </Tabs>
          
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {activeTab === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 600 }}>
                  Available Components
                </Typography>
                <List dense>
                  {['Graph View', 'Timeline', 'Table', 'Map', 'Notes', 'Evidence Board'].map((comp, index) => (
                    <ListItem 
                      key={index}
                      button
                      onClick={handleAddComponent}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        '&:hover': { backgroundColor: theme.palette.action.hover }
                      }}
                    >
                      <ListItemIcon>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={comp} />
                    </ListItem>
                  ))}
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 600 }}>
                  Current Components
                </Typography>
                <List dense>
                  {filteredComponents.map((comp) => (
                    <ListItem 
                      key={comp.id}
                      button
                      selected={activeComponentId === comp.id}
                      onClick={() => setActiveComponentId(comp.id)}
                      onContextMenu={(e) => handleContextMenu(e, comp.id)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        '&.Mui-selected': { 
                          backgroundColor: theme.palette.action.selected,
                          '&:hover': { backgroundColor: theme.palette.action.hover }
                        },
                        '&:hover': { backgroundColor: theme.palette.action.hover }
                      }}
                    >
                      <ListItemIcon>
                        <ViewListIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={comp.title} 
                        secondary={comp.type}
                        primaryTypographyProps={{ fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                      {comp.linked && (
                        <Tooltip title="Linked">
                          <LinkIcon fontSize="small" sx={{ color: '#10B981' }} />
                        </Tooltip>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box>
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 600 }}>
                  Active Links
                </Typography>
                <List dense>
                  {currentWorkspace?.components
                    .filter(comp => comp.linkedTo.length > 0)
                    .map(comp => (
                      <Accordion key={comp.id} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>{comp.title}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {comp.linkedTo.map(linkedId => {
                              const linkedComp = currentWorkspace.components.find(c => c.id === linkedId);
                              return linkedComp ? (
                                <ListItem key={linkedId} sx={{ pl: 0 }}>
                                  <ListItemText 
                                    primary={linkedComp.title}
                                    primaryTypographyProps={{ fontSize: '0.8rem' }}
                                  />
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleRemoveLink(comp.id, linkedId)}
                                    title="Remove link"
                                  >
                                    <LinkOffIcon fontSize="small" />
                                  </IconButton>
                                </ListItem>
                              ) : null;
                            })}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                </List>
              </Box>
            )}
            
            {activeTab === 2 && (
              <Box>
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 600 }}>
                  Workspace History
                </Typography>
                <List dense>
                  {workspaces.slice(0, 5).map((ws) => (
                    <ListItem 
                      key={ws.id}
                      button
                      onClick={() => handleWorkspaceLoad(ws.id)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        '&:hover': { backgroundColor: theme.palette.action.hover }
                      }}
                    >
                      <ListItemText 
                        primary={ws.name}
                        secondary={`${new Date(ws.updatedAt).toLocaleDateString()} - ${ws.components.length} components`}
                        primaryTypographyProps={{ fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ fontSize: '0.7rem', color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Workspace Canvas */}
        <Box 
          ref={workspaceRef}
          sx={{ 
            flex: 1, 
            position: 'relative',
            overflow: 'auto',
            p: 2,
            backgroundColor: showGrid ? '#F8FAFC' : theme.palette.background.default,
            backgroundImage: showGrid 
              ? 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)'
              : 'none',
            backgroundSize: showGrid ? '20px 20px' : 'auto'
          }}
        >
          {currentWorkspace ? (
            <Box
              sx={{
                position: 'relative',
                width: '200%',
                height: '200%',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: '0 0',
              }}
            >
              {/* Render components based on layout mode */}
              {layoutMode === 'grid' && (
                <Grid container spacing={2} sx={{ p: 2 }}>
                  {currentWorkspace.components.map((component) => (
                    <Grid 
                      item 
                      xs={component.size.width / 5} 
                      key={component.id}
                      sx={{ 
                        height: `${component.size.height * 4}px`,
                        position: 'relative'
                      }}
                    >
                      {renderComponent(component)}
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {layoutMode === 'flex' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2 }}>
                  {currentWorkspace.components.map((component) => (
                    <Box 
                      key={component.id}
                      sx={{ 
                        minWidth: 200,
                        flex: 1,
                        height: `${component.size.height * 4}px`,
                        position: 'relative'
                      }}
                    >
                      {renderComponent(component)}
                    </Box>
                  ))}
                </Box>
              )}
              
              {layoutMode === 'free' && (
                <Box sx={{ position: 'relative', height: '800px' }}>
                  {currentWorkspace.components.map((component) => (
                    <Box
                      key={component.id}
                      sx={{
                        position: 'absolute',
                        left: `${component.position.x}%`,
                        top: `${component.position.y}%`,
                        width: `${component.size.width}%`,
                        height: `${component.size.height * 4}px`,
                        zIndex: activeComponentId === component.id ? 10 : 1,
                      }}
                    >
                      {renderComponent(component)}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%' 
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No workspace loaded. Create or load a workspace to get started.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Status Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 1, 
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper,
          fontSize: '0.75rem'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                size="small"
              />
            }
            label="Grid"
            sx={{ fontSize: '0.75rem' }}
            labelPlacement="start"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showLinks}
                onChange={(e) => setShowLinks(e.target.checked)}
                size="small"
              />
            }
            label="Links"
            sx={{ fontSize: '0.75rem' }}
            labelPlacement="start"
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Layout:</Typography>
            <IconButton 
              size="small" 
              onClick={() => setLayoutMode('grid')}
              title="Grid Layout"
              color={layoutMode === 'grid' ? 'primary' : 'default'}
            >
              <GridLayoutIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setLayoutMode('flex')}
              title="Flex Layout"
              color={layoutMode === 'flex' ? 'primary' : 'default'}
            >
              <ColumnLayoutIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setLayoutMode('free')}
              title="Free Layout"
              color={layoutMode === 'free' ? 'primary' : 'default'}
            >
              <ComfyLayoutIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>Zoom:</Typography>
            <Slider
              value={zoomLevel}
              onChange={(_, value) => setZoomLevel(value as number)}
              min={50}
              max={150}
              step={10}
              size="small"
              sx={{ width: 100 }}
              valueLabelDisplay="auto"
            />
            <Typography>{zoomLevel}%</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>
            {currentWorkspace?.components.length || 0} components
          </Typography>
          <Typography>
            {activeCollaborators.length} active collaborators
          </Typography>
        </Box>
      </Box>
      
      {/* Context Menu */}
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.anchorPoint.y, left: contextMenu.anchorPoint.x } : undefined}
        open={!!contextMenu}
        onClose={handleContextMenuClose}
        onClick={handleContextMenuClose}
      >
        <MuiMenuItem onClick={() => handleComponentAction('delete')}>
          Delete Component
        </MuiMenuItem>
        <MuiMenuItem onClick={() => handleComponentAction('duplicate')}>
          Duplicate Component
        </MuiMenuItem>
        <MuiMenuItem onClick={() => handleComponentAction('unlink')}>
          Remove All Links
        </MuiMenuItem>
      </Menu>
      
      {/* Save Workspace Dialog */}
      <SaveWorkspaceDialog 
        open={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSubmit={handleSaveSubmit}
        workspace={currentWorkspace}
      />
      
      {/* Load Workspace Dialog */}
      <LoadWorkspaceDialog 
        open={isLoadDialogOpen}
        onClose={() => setIsLoadDialogOpen(false)}
        onWorkspaceLoad={handleWorkspaceLoad}
        workspaces={workspaces}
      />
      
      {/* Settings Dialog */}
      <SettingsDialog 
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {/* Share Dialog */}
      <ShareDialog 
        open={isSharingOpen}
        onClose={() => setIsSharingOpen(false)}
        workspace={currentWorkspace}
        collaborators={collaborators}
      />
    </Box>
  );
};

// Save Workspace Dialog Component
const SaveWorkspaceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, tags: string[]) => void;
  workspace: WorkspaceLayout | null;
}> = ({ open, onClose, onSubmit, workspace }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setTags([...workspace.tags]);
    } else {
      setName('');
      setDescription('');
      setTags([]);
    }
  }, [workspace]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    onSubmit(name, description, tags);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Workspace</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Workspace Name"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size="small"
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Add a tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              sx={{ flex: 1 }}
            />
            <Button onClick={handleAddTag} variant="outlined">Add</Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Load Workspace Dialog Component
const LoadWorkspaceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onWorkspaceLoad: (workspaceId: string) => void;
  workspaces: WorkspaceLayout[];
}> = ({ open, onClose, onWorkspaceLoad, workspaces }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkspaces = workspaces.filter(ws => 
    ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Load Workspace</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Search Workspaces"
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        <List>
          {filteredWorkspaces.map((workspace) => (
            <ListItem 
              key={workspace.id}
              button
              onClick={() => {
                onWorkspaceLoad(workspace.id);
              }}
              sx={{ 
                borderRadius: 1, 
                mb: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <ListItemText 
                primary={workspace.name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {workspace.description}
                    </Typography>
                    <br />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {workspace.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </>
                }
              />
              <ListItemText 
                primary={new Date(workspace.updatedAt).toLocaleString()}
                secondary={`${workspace.components.length} components`}
                sx={{ textAlign: 'right' }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

// Settings Dialog Component
const SettingsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [autoSave, setAutoSave] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Workspace Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
            }
            label="Auto-save workspace"
          />
          <FormControlLabel
            control={
              <Switch
                checked={gridVisible}
                onChange={(e) => setGridVisible(e.target.checked)}
              />
            }
            label="Show grid"
          />
          <FormControlLabel
            control={
              <Switch
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
            }
            label="Snap to grid"
          />
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Default Zoom Level: {zoomLevel}%</Typography>
            <Slider
              value={zoomLevel}
              onChange={(_, value) => setZoomLevel(value as number)}
              min={50}
              max={150}
              step={10}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Share Dialog Component
const ShareDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  workspace: WorkspaceLayout | null;
  collaborators: WorkspaceUser[];
}> = ({ open, onClose, workspace, collaborators }) => {
  const [isPublic, setIsPublic] = useState(workspace?.isPublic || false);
  const [sharedWith, setSharedWith] = useState<string[]>(workspace?.sharedWith || []);
  const [newCollaborator, setNewCollaborator] = useState('');

  const availableUsers = collaborators.filter(
    user => user.id !== workspace?.userId && !sharedWith.includes(user.id)
  );

  const handleAddCollaborator = () => {
    if (newCollaborator) {
      setSharedWith([...sharedWith, newCollaborator]);
      setNewCollaborator('');
    }
  };

  const handleRemoveCollaborator = (userId: string) => {
    setSharedWith(sharedWith.filter(id => id !== userId));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Workspace</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            }
            label="Make workspace public"
          />
          
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Shared with:</Typography>
          <List dense>
            {sharedWith.map(userId => {
              const user = collaborators.find(u => u.id === userId);
              return user ? (
                <ListItem key={userId}>
                  <ListItemText primary={user.name} secondary={user.email} />
                  <IconButton onClick={() => handleRemoveCollaborator(userId)}>
                    <CloseIcon />
                  </IconButton>
                </ListItem>
              ) : null;
            })}
          </List>
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Add Collaborator</InputLabel>
              <Select
                value={newCollaborator}
                label="Add Collaborator"
                onChange={(e) => setNewCollaborator(e.target.value as string)}
              >
                {availableUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button onClick={handleAddCollaborator}>Add</Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} variant="contained">Share</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnalysisWorkspace;