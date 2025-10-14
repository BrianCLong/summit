import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Compare,
  Add,
  Remove,
  Edit,
  SwapHoriz,
  Visibility,
  Close,
  Download,
  Share,
  ExpandMore,
  TrendingUp,
  TrendingDown,
  Timeline,
  AccountTree,
  Group,
  LocationOn,
  Description,
  Star,
  Warning,
  CheckCircle,
  Info,
  FilterList,
  Search,
  Restore
} from '@mui/icons-material';
import { format } from 'date-fns';

function VersionComparison({ 
  version1, 
  version2, 
  onClose, 
  onRestoreVersion,
  onMergeVersions,
  graphData1,
  graphData2
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChanges, setSelectedChanges] = useState(new Set());
  const [mergeDialog, setMergeDialog] = useState(false);

  // Mock comparison data - in real app, this would be computed from actual graph data
  useEffect(() => {
    setLoading(true);
    // Simulate comparison calculation
    setTimeout(() => {
      setComparisonData({
        summary: {
          totalChanges: 47,
          nodesAdded: 12,
          nodesRemoved: 3,
          nodesModified: 8,
          edgesAdded: 18,
          edgesRemoved: 2,
          edgesModified: 4
        },
        nodeChanges: [
          {
            id: 'node_1',
            type: 'added',
            label: 'Acme Corporation',
            entityType: 'Organization',
            properties: {
              location: 'New York',
              industry: 'Financial Services'
            },
            addedBy: 'Sarah Detective',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
          },
          {
            id: 'node_2',
            type: 'removed',
            label: 'Old Bank Account',
            entityType: 'Bank Account',
            removedBy: 'John Analyst',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
            reason: 'Duplicate entry'
          },
          {
            id: 'node_3',
            type: 'modified',
            label: 'John Smith',
            entityType: 'Person',
            changes: {
              location: { from: 'Boston', to: 'New York' },
              occupation: { from: 'Unknown', to: 'Financial Advisor' }
            },
            modifiedBy: 'Mike Operative',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1)
          }
        ],
        edgeChanges: [
          {
            id: 'edge_1',
            type: 'added',
            source: 'John Smith',
            target: 'Acme Corporation',
            relationship: 'WORKS_FOR',
            properties: {
              startDate: '2023-01-15',
              position: 'Senior Advisor'
            },
            addedBy: 'Sarah Detective',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
          },
          {
            id: 'edge_2',
            type: 'removed',
            source: 'John Smith',
            target: 'Old Bank Account',
            relationship: 'OWNS',
            removedBy: 'John Analyst',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
          }
        ],
        statistics: {
          version1: {
            nodes: 89,
            edges: 134,
            density: 0.34,
            avgDegree: 3.01,
            components: 2,
            clusters: 7
          },
          version2: {
            nodes: 98,
            edges: 150,
            density: 0.31,
            avgDegree: 3.06,
            components: 2,
            clusters: 8
          }
        },
        conflicts: [
          {
            id: 'conflict_1',
            type: 'property_conflict',
            entityId: 'node_3',
            entityLabel: 'John Smith',
            property: 'location',
            version1Value: 'Boston',
            version2Value: 'Chicago',
            description: 'Location property has different values in both versions'
          }
        ]
      });
      setLoading(false);
    }, 1500);
  }, [version1, version2]);

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'added': return 'success';
      case 'removed': return 'error';
      case 'modified': return 'warning';
      default: return 'default';
    }
  };

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'added': return <Add />;
      case 'removed': return <Remove />;
      case 'modified': return <Edit />;
      default: return <SwapHoriz />;
    }
  };

  const StatCard = ({ title, value1, value2, icon, format = 'number' }) => {
    const diff = value2 - value1;
    const diffPercent = value1 > 0 ? ((diff / value1) * 100).toFixed(1) : 0;
    
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">{title}</Typography>
            {icon}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {format === 'percentage' ? `${value2}%` : value2}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs {format === 'percentage' ? `${value1}%` : value1}
              </Typography>
            </Box>
            {diff !== 0 && (
              <Chip
                icon={diff > 0 ? <TrendingUp /> : <TrendingDown />}
                label={`${diff > 0 ? '+' : ''}${diff} (${diffPercent}%)`}
                color={diff > 0 ? 'success' : 'error'}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const ChangeItem = ({ change, isEdge = false }) => (
    <ListItem
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        bgcolor: 'background.paper'
      }}
    >
      <ListItemIcon>
        <Avatar sx={{ bgcolor: `${getChangeTypeColor(change.type)}.main` }}>
          {getChangeTypeIcon(change.type)}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {isEdge ? `${change.source} → ${change.target}` : change.label}
            </Typography>
            <Chip 
              label={change.type} 
              color={getChangeTypeColor(change.type)} 
              size="small" 
              variant="outlined"
            />
            {!isEdge && (
              <Chip 
                label={change.entityType} 
                size="small" 
                variant="outlined"
              />
            )}
            {isEdge && (
              <Chip 
                label={change.relationship} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 1 }}>
            {change.type === 'modified' && change.changes && (
              <Box sx={{ mb: 1 }}>
                {Object.entries(change.changes).map(([key, value]) => (
                  <Typography key={key} variant="caption" sx={{ display: 'block' }}>
                    {key}: <span style={{ textDecoration: 'line-through' }}>{value.from}</span> → <strong>{value.to}</strong>
                  </Typography>
                ))}
              </Box>
            )}
            {(change.properties || change.reason) && (
              <Typography variant="caption" color="text.secondary">
                {change.reason || JSON.stringify(change.properties)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              By {change.addedBy || change.removedBy || change.modifiedBy} • {format(change.timestamp, 'MMM dd, HH:mm')}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );

  const OverviewTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comparison Summary
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {version1.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(version1.timestamp, 'MMM dd, yyyy HH:mm')}
              </Typography>
              <Typography variant="body2">
                By {version1.author}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {version2.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(version2.timestamp, 'MMM dd, yyyy HH:mm')}
              </Typography>
              <Typography variant="body2">
                By {version2.author}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {comparisonData && (
        <>
          <Typography variant="h6" gutterBottom>
            Change Summary
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Add color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {comparisonData.summary.nodesAdded + comparisonData.summary.edgesAdded}
                  </Typography>
                  <Typography variant="caption">Added</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Remove color="error" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="error.main">
                    {comparisonData.summary.nodesRemoved + comparisonData.summary.edgesRemoved}
                  </Typography>
                  <Typography variant="caption">Removed</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Edit color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {comparisonData.summary.nodesModified + comparisonData.summary.edgesModified}
                  </Typography>
                  <Typography variant="caption">Modified</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Compare sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">
                    {comparisonData.summary.totalChanges}
                  </Typography>
                  <Typography variant="caption">Total Changes</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {comparisonData.conflicts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {comparisonData.conflicts.length} Conflicts Detected
              </Typography>
              {comparisonData.conflicts.map((conflict) => (
                <Typography key={conflict.id} variant="body2">
                  • {conflict.description}
                </Typography>
              ))}
            </Alert>
          )}
        </>
      )}
    </Box>
  );

  const ChangesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Detailed Changes
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
            />
          }
          label="Show only changes"
        />
      </Box>

      {comparisonData && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">
                Node Changes ({comparisonData.nodeChanges.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {comparisonData.nodeChanges.map((change) => (
                  <ChangeItem key={change.id} change={change} />
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">
                Edge Changes ({comparisonData.edgeChanges.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {comparisonData.edgeChanges.map((change) => (
                  <ChangeItem key={change.id} change={change} isEdge />
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );

  const StatisticsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Graph Statistics Comparison
      </Typography>
      
      {comparisonData && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Nodes"
              value1={comparisonData.statistics.version1.nodes}
              value2={comparisonData.statistics.version2.nodes}
              icon={<AccountTree />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Edges"
              value1={comparisonData.statistics.version1.edges}
              value2={comparisonData.statistics.version2.edges}
              icon={<Timeline />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Density"
              value1={comparisonData.statistics.version1.density}
              value2={comparisonData.statistics.version2.density}
              icon={<Group />}
              format="percentage"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Avg Degree"
              value1={comparisonData.statistics.version1.avgDegree}
              value2={comparisonData.statistics.version2.avgDegree}
              icon={<Star />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Components"
              value1={comparisonData.statistics.version1.components}
              value2={comparisonData.statistics.version2.components}
              icon={<Group />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              title="Clusters"
              value1={comparisonData.statistics.version1.clusters}
              value2={comparisonData.statistics.version2.clusters}
              icon={<Group />}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Analyzing differences...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Version Comparison
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
            >
              Export Diff
            </Button>
            <Button
              variant="outlined"
              startIcon={<Share />}
            >
              Share
            </Button>
            <Button
              variant="contained"
              startIcon={<Restore />}
              onClick={() => setMergeDialog(true)}
            >
              Merge Changes
            </Button>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Overview" icon={<Info />} iconPosition="start" />
          <Tab 
            label={
              <Badge badgeContent={comparisonData?.summary.totalChanges} color="primary">
                Changes
              </Badge>
            }
            icon={<Compare />} 
            iconPosition="start" 
          />
          <Tab label="Statistics" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {activeTab === 0 && <OverviewTab />}
          {activeTab === 1 && <ChangesTab />}
          {activeTab === 2 && <StatisticsTab />}
        </Box>
      </Box>

      {/* Merge Dialog */}
      <Dialog open={mergeDialog} onClose={() => setMergeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Merge Version Changes</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Merging will apply selected changes from {version1.name} to {version2.name}. 
            This action cannot be undone.
          </Alert>
          <Typography variant="body2">
            Select which changes you want to merge, or merge all changes automatically.
            Conflicts will need to be resolved manually.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialog(false)}>Cancel</Button>
          <Button variant="outlined">Select Changes</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              onMergeVersions?.(version1, version2);
              setMergeDialog(false);
            }}
          >
            Merge All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VersionComparison;