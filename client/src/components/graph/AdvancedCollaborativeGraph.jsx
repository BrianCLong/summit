import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Toolbar,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  AvatarGroup,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  TextField,
} from '@mui/material';
import {
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Share as ShareIcon,
  Comment as CommentIcon,
  Timeline as TimelineIcon,
  Psychology as AIIcon,
  FilterList as FilterIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';
import { useSocket } from '../../hooks/useSocket';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';

import { ExportAPI } from '../../services/api';

// Register Cytoscape extensions
cytoscape.use(cola);
cytoscape.use(fcose);
cytoscape.use(dagre);

const AdvancedCollaborativeGraph = ({
  graphId = 'default-graph',
  entities = [],
  relationships = [],
  onEntitySelect,
  onEntityUpdate,
  onAddComment,
}) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [userCursors, setUserCursors] = useState(new Map());
  const [showPresence, setShowPresence] = useState(true);
  const [showCursors, setShowCursors] = useState(true);
  const [collaborationDrawerOpen, setCollaborationDrawerOpen] = useState(false);
  const [layoutType, setLayoutType] = useState('fcose');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleExport = async () => {
    if (!cy) return;
    const image = cy.png({ full: true });
    const metadata = {
      entities: entities.length,
      relationships: relationships.length,
    };
    const password = window.prompt('Password for PDF (optional)') || '';
    try {
      const blob = await ExportAPI.pdf({ image, metadata, password });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation${password ? '.pdf.enc' : '.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  // Socket connection for real-time collaboration
  const socket = useSocket('/realtime', {
    auth: { token: 'dev-token' }, // Development token
  });

  // Graph styles
  const graphStyle = [
    {
      selector: 'node',
      style: {
        'background-color': '#3f51b5',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: '#ffffff',
        'font-size': '12px',
        width: '60px',
        height: '60px',
        'border-width': '2px',
        'border-color': '#1976d2',
        'overlay-padding': '6px',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#ff9800',
        'border-width': '3px',
        'background-color': '#ff9800',
      },
    },
    {
      selector: 'node[type="PERSON"]',
      style: {
        'background-color': '#4caf50',
        'border-color': '#388e3c',
      },
    },
    {
      selector: 'node[type="ORGANIZATION"]',
      style: {
        'background-color': '#2196f3',
        'border-color': '#1976d2',
      },
    },
    {
      selector: 'node[type="EVENT"]',
      style: {
        'background-color': '#f44336',
        'border-color': '#d32f2f',
      },
    },
    {
      selector: 'node[type="LOCATION"]',
      style: {
        'background-color': '#9c27b0',
        'border-color': '#7b1fa2',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(type)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#ff9800',
        'target-arrow-color': '#ff9800',
      },
    },
    // Collaborative selection styles
    {
      selector: 'node.collaborator-selected',
      style: {
        'border-color': '#e91e63',
        'border-width': '4px',
        'overlay-color': '#e91e63',
        'overlay-opacity': 0.3,
      },
    },
  ];

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cytoscapeInstance = cytoscape({
      container: containerRef.current,
      style: graphStyle,
      layout: {
        name: layoutType,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 30,
      },
      elements: [
        ...entities.map((entity) => ({
          data: {
            id: entity.id,
            label: entity.props?.name || entity.type,
            type: entity.type,
            ...entity.props,
          },
        })),
        ...relationships.map((rel) => ({
          data: {
            id: rel.id,
            source: rel.from,
            target: rel.to,
            type: rel.type,
            ...rel.props,
          },
        })),
      ],
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.1,
    });

    // Event handlers
    cytoscapeInstance.on('select', 'node', (event) => {
      const node = event.target;
      const entityId = node.id();
      setSelectedEntity(entityId);

      // Notify collaborators
      if (socket?.connected) {
        socket.emit('entity_select', { graphId, entityId });
      }

      if (onEntitySelect) {
        onEntitySelect(entityId, node.data());
      }
    });

    cytoscapeInstance.on('unselect', 'node', (event) => {
      const entityId = event.target.id();

      // Notify collaborators
      if (socket?.connected) {
        socket.emit('entity_deselect', { graphId, entityId });
      }
    });

    // Mouse move for cursor tracking
    cytoscapeInstance.on('mousemove', (event) => {
      if (socket?.connected && showCursors) {
        const position = event.position || event.cyPosition;
        if (position) {
          socket.emit('cursor_move', {
            graphId,
            position: { x: position.x, y: position.y },
            viewport: {
              zoom: cytoscapeInstance.zoom(),
              pan: cytoscapeInstance.pan(),
            },
          });
        }
      }
    });

    // Zoom tracking
    cytoscapeInstance.on('zoom', () => {
      setZoomLevel(cytoscapeInstance.zoom());
    });

    setCy(cytoscapeInstance);
    cyRef.current = cytoscapeInstance;

    return () => {
      if (cytoscapeInstance) {
        cytoscapeInstance.destroy();
      }
    };
  }, [entities, relationships, layoutType, graphId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join_graph', { graphId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setCollaborators([]);
      setUserCursors(new Map());
    };

    const handleUserJoined = (data) => {
      setCollaborators((prev) => {
        const existing = prev.find((c) => c.userId === data.userId);
        if (existing) return prev;
        return [...prev, { userId: data.userId, username: data.username, joinedAt: data.ts }];
      });
    };

    const handleUserLeft = (data) => {
      setCollaborators((prev) => prev.filter((c) => c.userId !== data.userId));
      setUserCursors((prev) => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    };

    const handleCursorUpdate = (data) => {
      if (!showCursors) return;
      setUserCursors((prev) => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, {
          username: data.username,
          position: data.position,
          viewport: data.viewport,
          lastUpdate: data.ts,
        });
        return newCursors;
      });
    };

    const handleEntitySelected = (data) => {
      if (cy) {
        const node = cy.getElementById(data.entityId);
        if (node.length) {
          node.addClass('collaborator-selected');
          setTimeout(() => {
            node.removeClass('collaborator-selected');
          }, 3000); // Remove highlight after 3 seconds
        }
      }
    };

    const handleEntityUpdated = (data) => {
      if (cy && onEntityUpdate) {
        onEntityUpdate(data.entityId, data.changes);
      }
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('user_joined_graph', handleUserJoined);
    socket.on('user_left_graph', handleUserLeft);
    socket.on('cursor_update', handleCursorUpdate);
    socket.on('entity_selected', handleEntitySelected);
    socket.on('entity_updated', handleEntityUpdated);

    // Connect if already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('user_joined_graph', handleUserJoined);
      socket.off('user_left_graph', handleUserLeft);
      socket.off('cursor_update', handleCursorUpdate);
      socket.off('entity_selected', handleEntitySelected);
      socket.off('entity_updated', handleEntityUpdated);
    };
  }, [socket, cy, graphId, showCursors, onEntityUpdate]);

  // Layout controls
  const changeLayout = useCallback(
    (newLayout) => {
      if (cy) {
        setLayoutType(newLayout);
        cy.layout({
          name: newLayout,
          animate: true,
          animationDuration: 500,
          fit: true,
          padding: 30,
        }).run();
      }
    },
    [cy],
  );

  const zoomIn = useCallback(() => {
    if (cy) cy.zoom(cy.zoom() * 1.25);
  }, [cy]);

  const zoomOut = useCallback(() => {
    if (cy) cy.zoom(cy.zoom() * 0.8);
  }, [cy]);

  const centerGraph = useCallback(() => {
    if (cy) cy.fit();
  }, [cy]);

  const addComment = useCallback(() => {
    if (selectedEntity && newComment.trim() && socket?.connected) {
      const comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: 'current-user',
        timestamp: new Date().toISOString(),
      };

      socket.emit('comment_add', { entityId: selectedEntity, comment });
      if (onAddComment) {
        onAddComment(selectedEntity, comment);
      }
      setNewComment('');
    }
  }, [selectedEntity, newComment, socket, onAddComment]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🔗 Collaborative Graph Explorer
            <Chip
              size="small"
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              sx={{ ml: 1 }}
            />
          </Typography>

          {/* Collaborators */}
          <Tooltip title="Active Collaborators">
            <IconButton
              onClick={() => setCollaborationDrawerOpen(true)}
              color={collaborators.length > 0 ? 'primary' : 'default'}
            >
              <Badge badgeContent={collaborators.length} color="secondary">
                <PeopleIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Presence Toggle */}
          <Tooltip title="Show Presence">
            <IconButton onClick={() => setShowPresence(!showPresence)}>
              {showPresence ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>

          {/* Layout Controls */}
          <Tooltip title="Zoom In">
            <IconButton onClick={zoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom Out">
            <IconButton onClick={zoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Center Graph">
            <IconButton onClick={centerGraph}>
              <CenterIcon />
            </IconButton>
          </Tooltip>

          {/* Layout Selector */}
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const layouts = ['fcose', 'cola', 'dagre', 'circle', 'grid'];
              const currentIndex = layouts.indexOf(layoutType);
              const nextIndex = (currentIndex + 1) % layouts.length;
              changeLayout(layouts[nextIndex]);
            }}
          >
            Layout: {layoutType}
          </Button>

          <Tooltip title="Export PDF">
            <IconButton onClick={handleExport}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>

      {/* Graph Container */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fafafa',
          }}
        />

        {/* Live Cursors Overlay */}
        {showCursors && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            {Array.from(userCursors.entries()).map(([userId, cursor]) => (
              <Box
                key={userId}
                sx={{
                  position: 'absolute',
                  left: cursor.position.x,
                  top: cursor.position.y,
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
              >
                <Box
                  sx={{
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '12px solid #e91e63',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: '#e91e63',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    marginLeft: '8px',
                    display: 'block',
                  }}
                >
                  {cursor.username}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Status Overlay */}
        <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
          <Paper elevation={3} sx={{ p: 1, minWidth: 200 }}>
            <Typography variant="caption" display="block">
              Zoom: {(zoomLevel * 100).toFixed(0)}%
            </Typography>
            <Typography variant="caption" display="block">
              Entities: {entities.length} | Relationships: {relationships.length}
            </Typography>
            <Typography
              variant="caption"
              display="block"
              color={isConnected ? 'success.main' : 'error.main'}
            >
              {isConnected
                ? `✅ Connected (${collaborators.length} collaborators)`
                : '❌ Disconnected'}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Comments Panel */}
      {selectedEntity && (
        <Paper elevation={2} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            💬 Add Comment to Selected Entity
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={addComment}
              disabled={!newComment.trim()}
            >
              Add
            </Button>
          </Box>
        </Paper>
      )}

      {/* Collaboration Drawer */}
      <Drawer
        anchor="right"
        open={collaborationDrawerOpen}
        onClose={() => setCollaborationDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            👥 Collaboration
          </Typography>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2">Settings</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showPresence}
                    onChange={(e) => setShowPresence(e.target.checked)}
                  />
                }
                label="Show Presence"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showCursors}
                    onChange={(e) => setShowCursors(e.target.checked)}
                  />
                }
                label="Show Live Cursors"
              />
            </CardContent>
          </Card>

          <Typography variant="subtitle2" gutterBottom>
            Active Collaborators ({collaborators.length})
          </Typography>

          <List>
            {collaborators.map((collaborator) => (
              <ListItem key={collaborator.userId}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#e91e63' }}>
                    {collaborator.username?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={collaborator.username || 'Anonymous'}
                  secondary={`Joined ${new Date(collaborator.joinedAt).toLocaleTimeString()}`}
                />
              </ListItem>
            ))}
            {collaborators.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No active collaborators"
                  secondary="Others will appear here when they join"
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default AdvancedCollaborativeGraph;
