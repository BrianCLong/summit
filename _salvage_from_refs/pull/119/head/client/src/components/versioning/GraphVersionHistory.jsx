import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  History,
  RestoreFromTrash,
  Compare,
  Save,
  Branch,
  Merge,
  MoreVert,
  Visibility,
  Download,
  Share,
  Delete,
  Star,
  StarBorder,
  Label,
  Schedule,
  Person,
  Changes,
  Add,
  Remove,
  Edit,
  ExpandMore,
  CheckCircle,
  Warning,
  Info,
  Backup,
  CloudDownload
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';

function GraphVersionHistory({ 
  graphId, 
  currentVersion, 
  onVersionSelect, 
  onVersionRestore,
  onVersionCompare,
  onCreateSnapshot,
  onDeleteVersion,
  onVersionTag
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [compareDialog, setCompareDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [newTag, setNewTag] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Mock version data - in real app, this would come from API
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setVersions([
        {
          id: 'v1.0.0',
          name: 'Initial Investigation Setup',
          description: 'Created base graph with initial entities and relationships',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
          author: 'John Analyst',
          authorId: 'user1',
          avatar: null,
          isCurrent: false,
          isStarred: true,
          tags: ['milestone', 'initial'],
          stats: {
            nodes: 45,
            edges: 67,
            changes: 112
          },
          changes: [
            { type: 'add', entity: 'Person', count: 15 },
            { type: 'add', entity: 'Organization', count: 8 },
            { type: 'add', entity: 'Location', count: 12 },
            { type: 'add', entity: 'Connection', count: 67 }
          ],
          size: '2.4 MB',
          commitHash: 'a1b2c3d4'
        },
        {
          id: 'v1.1.0',
          name: 'Added Financial Entities',
          description: 'Integrated financial records and bank account information',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
          author: 'Sarah Detective',
          authorId: 'user2',
          avatar: null,
          isCurrent: false,
          isStarred: false,
          tags: ['financial', 'enhancement'],
          stats: {
            nodes: 67,
            edges: 89,
            changes: 44
          },
          changes: [
            { type: 'add', entity: 'Bank Account', count: 12 },
            { type: 'add', entity: 'Transaction', count: 22 },
            { type: 'edit', entity: 'Person', count: 5 },
            { type: 'add', entity: 'Connection', count: 22 }
          ],
          size: '3.1 MB',
          commitHash: 'e5f6g7h8',
          parentVersion: 'v1.0.0'
        },
        {
          id: 'v1.2.0',
          name: 'Geographic Analysis Update',
          description: 'Added location clustering and geographic relationship mapping',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          author: 'Mike Operative',
          authorId: 'user3',
          avatar: null,
          isCurrent: false,
          isStarred: true,
          tags: ['geospatial', 'analysis'],
          stats: {
            nodes: 89,
            edges: 134,
            changes: 67
          },
          changes: [
            { type: 'add', entity: 'Location Cluster', count: 8 },
            { type: 'edit', entity: 'Location', count: 14 },
            { type: 'add', entity: 'Geographic Link', count: 45 }
          ],
          size: '4.7 MB',
          commitHash: 'i9j0k1l2',
          parentVersion: 'v1.1.0'
        },
        {
          id: 'v1.3.0',
          name: 'Current Working Version',
          description: 'Latest changes with sentiment analysis integration',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          author: 'John Analyst',
          authorId: 'user1',
          avatar: null,
          isCurrent: true,
          isStarred: false,
          tags: ['current', 'ai-enhanced'],
          stats: {
            nodes: 112,
            edges: 178,
            changes: 44
          },
          changes: [
            { type: 'add', entity: 'Communication', count: 23 },
            { type: 'edit', entity: 'Person', count: 12 },
            { type: 'add', entity: 'Sentiment Link', count: 44 }
          ],
          size: '6.2 MB',
          commitHash: 'm3n4o5p6',
          parentVersion: 'v1.2.0'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [graphId]);

  const handleVersionSelect = (version) => {
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  const handleVersionRestore = (version) => {
    if (onVersionRestore) {
      onVersionRestore(version);
    }
  };

  const handleVersionCompare = () => {
    if (selectedVersions.length === 2 && onVersionCompare) {
      onVersionCompare(selectedVersions[0], selectedVersions[1]);
      setCompareDialog(false);
      setSelectedVersions([]);
    }
  };

  const handleCreateSnapshot = () => {
    if (onCreateSnapshot) {
      onCreateSnapshot({
        name: newVersionName,
        description: newVersionDescription
      });
      setCreateDialog(false);
      setNewVersionName('');
      setNewVersionDescription('');
    }
  };

  const handleAddTag = () => {
    if (selectedVersion && newTag && onVersionTag) {
      onVersionTag(selectedVersion.id, newTag);
      setTagDialog(false);
      setNewTag('');
      setSelectedVersion(null);
    }
  };

  const handleContextMenu = (event, version) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4
    });
    setSelectedVersion(version);
  };

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'add': return <Add color="success" />;
      case 'remove': return <Remove color="error" />;
      case 'edit': return <Edit color="warning" />;
      default: return <Changes />;
    }
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'add': return 'success';
      case 'remove': return 'error';
      case 'edit': return 'warning';
      default: return 'default';
    }
  };

  const VersionItem = ({ version, isTimeline = false }) => {
    const ItemContent = (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {version.name}
            </Typography>
            {version.isCurrent && (
              <Chip label="Current" color="primary" size="small" />
            )}
            {version.isStarred && <Star color="warning" fontSize="small" />}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {version.commitHash}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleContextMenu(e, version)}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {version.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person fontSize="small" />
            <Typography variant="caption">{version.author}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Schedule fontSize="small" />
            <Typography variant="caption">
              {formatDistanceToNow(version.timestamp, { addSuffix: true })}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {version.size}
          </Typography>
        </Box>

        {version.tags && version.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {version.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {version.stats.nodes} nodes
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {version.stats.edges} edges
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {version.stats.changes} changes
          </Typography>
        </Box>

        {showDetails && (
          <Accordion sx={{ mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="body2">View Changes</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {version.changes.map((change, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      {getChangeTypeIcon(change.type)}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={change.type}
                            size="small"
                            color={getChangeTypeColor(change.type)}
                            variant="outlined"
                          />
                          <Typography variant="body2">
                            {change.count} {change.entity}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          {!version.isCurrent && (
            <>
              <Button
                size="small"
                startIcon={<Visibility />}
                onClick={() => handleVersionSelect(version)}
              >
                View
              </Button>
              <Button
                size="small"
                startIcon={<RestoreFromTrash />}
                onClick={() => handleVersionRestore(version)}
              >
                Restore
              </Button>
            </>
          )}
          <Button
            size="small"
            startIcon={<Compare />}
            onClick={() => {
              if (selectedVersions.includes(version)) {
                setSelectedVersions(prev => prev.filter(v => v.id !== version.id));
              } else if (selectedVersions.length < 2) {
                setSelectedVersions(prev => [...prev, version]);
              }
            }}
            color={selectedVersions.includes(version) ? 'primary' : 'inherit'}
          >
            Compare
          </Button>
        </Box>
      </Box>
    );

    if (isTimeline) {
      return (
        <TimelineItem>
          <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
            {format(version.timestamp, 'MMM dd, yyyy HH:mm')}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineConnector />
            <TimelineDot color={version.isCurrent ? 'primary' : 'grey'}>
              {version.isCurrent ? <CheckCircle /> : <History />}
            </TimelineDot>
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent sx={{ py: '12px', px: 2 }}>
            <Paper sx={{ p: 2 }}>
              {ItemContent}
            </Paper>
          </TimelineContent>
        </TimelineItem>
      );
    }

    return (
      <Card sx={{ mb: 2, border: version.isCurrent ? 2 : 1, borderColor: version.isCurrent ? 'primary.main' : 'divider' }}>
        <CardContent>
          {ItemContent}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Version History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showDetails}
                onChange={(e) => setShowDetails(e.target.checked)}
              />
            }
            label="Show details"
          />
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={() => setCreateDialog(true)}
          >
            Create Snapshot
          </Button>
          {selectedVersions.length === 2 && (
            <Button
              variant="contained"
              startIcon={<Compare />}
              onClick={() => setCompareDialog(true)}
            >
              Compare Selected
            </Button>
          )}
        </Box>
      </Box>

      {/* Auto-save Setting */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            />
          }
          label="Enable automatic snapshots every 30 minutes"
        />
      </Alert>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Versions Timeline */}
      <Timeline position="right">
        {versions.map((version) => (
          <VersionItem key={version.id} version={version} isTimeline />
        ))}
      </Timeline>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => setTagDialog(true)}>
          <Label sx={{ mr: 1 }} />
          Add Tag
        </MenuItem>
        <MenuItem onClick={() => {
          setSelectedVersion(prev => ({ ...prev, isStarred: !prev.isStarred }));
          setContextMenu(null);
        }}>
          {selectedVersion?.isStarred ? <StarBorder sx={{ mr: 1 }} /> : <Star sx={{ mr: 1 }} />}
          {selectedVersion?.isStarred ? 'Unstar' : 'Star'}
        </MenuItem>
        <MenuItem>
          <Download sx={{ mr: 1 }} />
          Export
        </MenuItem>
        <MenuItem>
          <Share sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => onDeleteVersion?.(selectedVersion)}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Compare Dialog */}
      <Dialog open={compareDialog} onClose={() => setCompareDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          {selectedVersions.length === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Comparing: {selectedVersions[0].name} vs {selectedVersions[1].name}
              </Typography>
              <Alert severity="info">
                This will open a side-by-side comparison view showing the differences between these two versions.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleVersionCompare}>
            Open Comparison
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Snapshot Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Version Snapshot</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Version Name"
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            placeholder="e.g., Major Analysis Update"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={newVersionDescription}
            onChange={(e) => setNewVersionDescription(e.target.value)}
            placeholder="Describe the changes in this version..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSnapshot}
            disabled={!newVersionName.trim()}
          >
            Create Snapshot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialog} onClose={() => setTagDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Tag</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tag Name"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="e.g., milestone, reviewed, approved"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            Add Tag
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GraphVersionHistory;