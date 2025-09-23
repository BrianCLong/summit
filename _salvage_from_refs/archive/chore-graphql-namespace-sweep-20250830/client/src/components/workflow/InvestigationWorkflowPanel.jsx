import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Badge,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
import {
  Assignment,
  Add,
  PlayArrow,
  CheckCircle,
  Warning,
  Schedule,
  People,
  FileCopy,
  BugReport,
  Timeline,
  ExpandMore,
  Visibility,
  Edit,
  Security,
  Assessment,
  Flag,
  TrendingUp,
  Analytics,
  Folder,
  Description,
  Gavel,
  Science
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries for investigation workflow
const GET_ALL_INVESTIGATIONS = gql`
  query GetAllInvestigations {
    getAllInvestigations {
      id
      name
      description
      status
      priority
      assignedTo
      createdBy
      createdAt
      updatedAt
      dueDate
      tags
      classification
      currentStage
      entityCount
      evidenceCount
      findingCount
    }
  }
`;

const GET_INVESTIGATION_DETAIL = gql`
  query GetInvestigationDetail($investigationId: ID!) {
    getInvestigation(investigationId: $investigationId) {
      id
      name
      description
      status
      priority
      assignedTo
      createdBy
      createdAt
      updatedAt
      dueDate
      tags
      classification
      workflow {
        currentStage
        stages
      }
      entities
      relationships
      evidence {
        id
        type
        title
        description
        source
        collectedAt
        collectedBy
        integrity
        classification
      }
      findings {
        id
        title
        description
        severity
        confidence
        category
        status
        discoveredAt
        discoveredBy
        recommendations
      }
      timeline {
        id
        timestamp
        eventType
        title
        description
        actor
        severity
        confidence
      }
      collaborators
      permissions {
        userId
        role
        permissions
        grantedBy
        grantedAt
      }
    }
  }
`;

const GET_INVESTIGATION_TEMPLATES = gql`
  query GetInvestigationTemplates {
    getInvestigationTemplates {
      id
      name
      description
      category
      workflowStages
      requiredFields
      defaultTags
      defaultClassification
      estimatedDuration
      slaHours
    }
  }
`;

const GET_WORKFLOW_STATISTICS = gql`
  query GetWorkflowStatistics {
    getWorkflowStatistics {
      total
      byStatus
      byPriority
      byStage
      overdueSLA
    }
  }
`;

// GraphQL mutations
const CREATE_INVESTIGATION = gql`
  mutation CreateInvestigation($templateId: ID!, $data: InvestigationInput!) {
    createInvestigation(templateId: $templateId, data: $data) {
      id
      name
      status
      priority
      currentStage
      entityCount
      evidenceCount
      findingCount
    }
  }
`;

const ADVANCE_WORKFLOW_STAGE = gql`
  mutation AdvanceWorkflowStage($investigationId: ID!, $notes: String) {
    advanceWorkflowStage(investigationId: $investigationId, notes: $notes) {
      id
      workflow {
        currentStage
        stages
      }
    }
  }
`;

const ADD_EVIDENCE = gql`
  mutation AddEvidence($investigationId: ID!, $evidence: EvidenceInput!) {
    addEvidence(investigationId: $investigationId, evidence: $evidence) {
      id
      evidenceCount
      evidence {
        id
        title
        type
        collectedAt
        collectedBy
      }
    }
  }
`;

const ADD_FINDING = gql`
  mutation AddFinding($investigationId: ID!, $finding: FindingInput!) {
    addFinding(investigationId: $investigationId, finding: $finding) {
      id
      findingCount
      findings {
        id
        title
        severity
        category
        status
      }
    }
  }
`;

const InvestigationWorkflowPanel = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // New investigation form state
  const [newInvestigation, setNewInvestigation] = useState({
    templateId: '',
    name: '',
    description: '',
    priority: 'MEDIUM',
    assignedTo: ['user-1'],
    classification: 'CONFIDENTIAL',
    tags: []
  });

  // New evidence form state
  const [newEvidence, setNewEvidence] = useState({
    type: 'DIGITAL_ARTIFACT',
    title: '',
    description: '',
    source: '',
    classification: 'CONFIDENTIAL'
  });

  // New finding form state
  const [newFinding, setNewFinding] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    confidence: 0.8,
    category: 'VULNERABILITY',
    status: 'DRAFT',
    relatedEntities: [],
    evidence: [],
    recommendations: []
  });

  // GraphQL queries
  const { data: investigationsData, loading: investigationsLoading, refetch: refetchInvestigations } = useQuery(GET_ALL_INVESTIGATIONS, {
    pollInterval: 10000,
    errorPolicy: 'all'
  });

  const { data: templatesData } = useQuery(GET_INVESTIGATION_TEMPLATES, {
    errorPolicy: 'all'
  });

  const { data: statsData } = useQuery(GET_WORKFLOW_STATISTICS, {
    pollInterval: 15000,
    errorPolicy: 'all'
  });

  const { data: detailData, loading: detailLoading } = useQuery(GET_INVESTIGATION_DETAIL, {
    variables: { investigationId: selectedInvestigation },
    skip: !selectedInvestigation,
    errorPolicy: 'all'
  });

  // GraphQL mutations
  const [createInvestigation] = useMutation(CREATE_INVESTIGATION);
  const [advanceWorkflowStage] = useMutation(ADVANCE_WORKFLOW_STAGE);
  const [addEvidence] = useMutation(ADD_EVIDENCE);
  const [addFinding] = useMutation(ADD_FINDING);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateInvestigation = async () => {
    if (!newInvestigation.templateId || !newInvestigation.name) return;

    try {
      await createInvestigation({
        variables: {
          templateId: newInvestigation.templateId,
          data: {
            name: newInvestigation.name,
            description: newInvestigation.description,
            priority: newInvestigation.priority,
            assignedTo: newInvestigation.assignedTo,
            classification: newInvestigation.classification,
            tags: newInvestigation.tags
          }
        }
      });
      setCreateDialogOpen(false);
      setNewInvestigation({
        templateId: '',
        name: '',
        description: '',
        priority: 'MEDIUM',
        assignedTo: ['user-1'],
        classification: 'CONFIDENTIAL',
        tags: []
      });
      refetchInvestigations();
    } catch (err) {
      console.error('Create investigation error:', err);
    }
  };

  const handleAdvanceStage = async (investigationId) => {
    try {
      await advanceWorkflowStage({
        variables: { 
          investigationId,
          notes: `Advanced by user on ${new Date().toISOString()}`
        }
      });
      refetchInvestigations();
    } catch (err) {
      console.error('Advance stage error:', err);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedInvestigation || !newEvidence.title) return;

    try {
      await addEvidence({
        variables: {
          investigationId: selectedInvestigation,
          evidence: {
            ...newEvidence,
            attachments: [],
            metadata: null
          }
        }
      });
      setEvidenceDialogOpen(false);
      setNewEvidence({
        type: 'DIGITAL_ARTIFACT',
        title: '',
        description: '',
        source: '',
        classification: 'CONFIDENTIAL'
      });
    } catch (err) {
      console.error('Add evidence error:', err);
    }
  };

  const handleAddFinding = async () => {
    if (!selectedInvestigation || !newFinding.title) return;

    try {
      await addFinding({
        variables: {
          investigationId: selectedInvestigation,
          finding: newFinding
        }
      });
      setFindingDialogOpen(false);
      setNewFinding({
        title: '',
        description: '',
        severity: 'MEDIUM',
        confidence: 0.8,
        category: 'VULNERABILITY',
        status: 'DRAFT',
        relatedEntities: [],
        evidence: [],
        recommendations: []
      });
    } catch (err) {
      console.error('Add finding error:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'EMERGENCY': return 'error';
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'ON_HOLD': return 'warning';
      case 'ESCALATED': return 'error';
      case 'RESOLVED': return 'info';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL': return <Warning color="error" />;
      case 'HIGH': return <Flag color="warning" />;
      case 'MEDIUM': return <Assessment color="info" />;
      case 'LOW': return <CheckCircle color="success" />;
      default: return <Assessment />;
    }
  };

  const getWorkflowStageIcon = (stage) => {
    const icons = {
      'INTAKE': <Folder />,
      'TRIAGE': <Assessment />,
      'INVESTIGATION': <Analytics />,
      'ANALYSIS': <Science />,
      'CONTAINMENT': <Security />,
      'ERADICATION': <Gavel />,
      'RECOVERY': <TrendingUp />,
      'LESSONS_LEARNED': <Description />
    };
    return icons[stage] || <Assignment />;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment color="primary" />
            🔬 Investigation Workflow Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive investigation lifecycle management with evidence tracking and workflow automation
          </Typography>
          
          {statsData?.getWorkflowStatistics && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Total Investigations</Typography>
                  <Typography variant="h6" color="primary">
                    {statsData.getWorkflowStatistics.total}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Active Cases</Typography>
                  <Typography variant="h6" color="success.main">
                    {statsData.getWorkflowStatistics.byStatus?.ACTIVE || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Critical Priority</Typography>
                  <Typography variant="h6" color="error.main">
                    {statsData.getWorkflowStatistics.byPriority?.CRITICAL || 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Overdue SLA</Typography>
                  <Typography variant="h6" color="warning.main">
                    {statsData.getWorkflowStatistics.overdueSLA}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => setCreateDialogOpen(true)}
            >
              New Investigation
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab 
              label="All Investigations" 
              icon={<Badge badgeContent={investigationsData?.getAllInvestigations?.length || 0} color="primary">
                <Assignment />
              </Badge>}
            />
            <Tab 
              label="Templates" 
              icon={<Badge badgeContent={templatesData?.getInvestigationTemplates?.length || 0} color="secondary">
                <Folder />
              </Badge>}
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* All Investigations Tab */}
          {currentTab === 0 && (
            <Box>
              {investigationsLoading ? (
                <LinearProgress />
              ) : (
                <Grid container spacing={2}>
                  {investigationsData?.getAllInvestigations?.map((investigation) => (
                    <Grid item xs={12} sm={6} md={4} key={investigation.id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" noWrap>{investigation.name}</Typography>
                            <Chip 
                              label={investigation.status}
                              color={getStatusColor(investigation.status)}
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {investigation.description || 'No description'}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={investigation.priority}
                              color={getPriorityColor(investigation.priority)}
                              size="small"
                            />
                            <Chip 
                              label={investigation.classification}
                              variant="outlined"
                              size="small"
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            {getWorkflowStageIcon(investigation.currentStage)}
                            <Typography variant="caption">
                              {investigation.currentStage.replace(/_/g, ' ')}
                            </Typography>
                          </Box>

                          <Grid container spacing={1} sx={{ mb: 2 }}>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" display="block">Entities</Typography>
                                <Typography variant="h6">{investigation.entityCount}</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" display="block">Evidence</Typography>
                                <Typography variant="h6">{investigation.evidenceCount}</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" display="block">Findings</Typography>
                                <Typography variant="h6">{investigation.findingCount}</Typography>
                              </Box>
                            </Grid>
                          </Grid>

                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Created: {formatTimeAgo(investigation.createdAt)}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedInvestigation(investigation.id);
                                setDetailDialogOpen(true);
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="small" 
                              startIcon={<PlayArrow />}
                              onClick={() => handleAdvanceStage(investigation.id)}
                              disabled={investigation.currentStage === 'LESSONS_LEARNED'}
                            >
                              Advance
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {investigationsData?.getAllInvestigations?.length === 0 && (
                <Alert severity="info">
                  No investigations found. Create your first investigation using a template.
                </Alert>
              )}
            </Box>
          )}

          {/* Templates Tab */}
          {currentTab === 1 && (
            <Box>
              <Grid container spacing={2}>
                {templatesData?.getInvestigationTemplates?.map((template) => (
                  <Grid item xs={12} sm={6} key={template.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {template.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip label={template.category} size="small" />
                          <Chip 
                            label={template.defaultClassification} 
                            color="secondary" 
                            size="small" 
                          />
                        </Box>

                        <Typography variant="caption" display="block">
                          Estimated Duration: {template.estimatedDuration}h | SLA: {template.slaHours}h
                        </Typography>

                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Workflow Stages: {template.workflowStages.join(' → ')}
                          </Typography>
                        </Box>

                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<Add />}
                          sx={{ mt: 1 }}
                          onClick={() => {
                            setNewInvestigation(prev => ({ ...prev, templateId: template.id }));
                            setCreateDialogOpen(true);
                          }}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Investigation Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Investigation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select
                  value={newInvestigation.templateId}
                  label="Template"
                  onChange={(e) => setNewInvestigation(prev => ({ ...prev, templateId: e.target.value }))}
                >
                  {templatesData?.getInvestigationTemplates?.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Investigation Name"
                value={newInvestigation.name}
                onChange={(e) => setNewInvestigation(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newInvestigation.description}
                onChange={(e) => setNewInvestigation(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newInvestigation.priority}
                  label="Priority"
                  onChange={(e) => setNewInvestigation(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                  <MenuItem value="EMERGENCY">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Classification</InputLabel>
                <Select
                  value={newInvestigation.classification}
                  label="Classification"
                  onChange={(e) => setNewInvestigation(prev => ({ ...prev, classification: e.target.value }))}
                >
                  <MenuItem value="PUBLIC">Public</MenuItem>
                  <MenuItem value="INTERNAL">Internal</MenuItem>
                  <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                  <MenuItem value="SECRET">Secret</MenuItem>
                  <MenuItem value="TOP_SECRET">Top Secret</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInvestigation} variant="contained">
            Create Investigation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Investigation Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          {detailData?.getInvestigation?.name}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" startIcon={<FileCopy />} onClick={() => setEvidenceDialogOpen(true)}>
              Add Evidence
            </Button>
            <Button size="small" startIcon={<BugReport />} onClick={() => setFindingDialogOpen(true)}>
              Add Finding
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <LinearProgress />
          ) : detailData?.getInvestigation ? (
            <Box>
              {/* Investigation Overview */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2">Status & Priority</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip 
                        label={detailData.getInvestigation.status}
                        color={getStatusColor(detailData.getInvestigation.status)}
                        size="small"
                      />
                      <Chip 
                        label={detailData.getInvestigation.priority}
                        color={getPriorityColor(detailData.getInvestigation.priority)}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2">Current Stage</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      {getWorkflowStageIcon(detailData.getInvestigation.workflow.currentStage)}
                      <Typography variant="body2">
                        {detailData.getInvestigation.workflow.currentStage.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Evidence Section */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Evidence ({detailData.getInvestigation.evidence.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {detailData.getInvestigation.evidence.length === 0 ? (
                    <Alert severity="info">No evidence collected yet</Alert>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Collected By</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Integrity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailData.getInvestigation.evidence.map((evidence) => (
                          <TableRow key={evidence.id}>
                            <TableCell>{evidence.title}</TableCell>
                            <TableCell>{evidence.type.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{evidence.collectedBy}</TableCell>
                            <TableCell>{formatTimeAgo(evidence.collectedAt)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={evidence.integrity}
                                color={evidence.integrity === 'VERIFIED' ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Findings Section */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Findings ({detailData.getInvestigation.findings.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {detailData.getInvestigation.findings.length === 0 ? (
                    <Alert severity="info">No findings documented yet</Alert>
                  ) : (
                    <List>
                      {detailData.getInvestigation.findings.map((finding) => (
                        <ListItem key={finding.id} divider>
                          <ListItemIcon>
                            {getSeverityIcon(finding.severity)}
                          </ListItemIcon>
                          <ListItemText
                            primary={finding.title}
                            secondary={
                              <Box>
                                <Typography variant="body2">{finding.description}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                  <Chip 
                                    label={finding.category}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    label={`${Math.round(finding.confidence * 100)}% confidence`}
                                    size="small"
                                  />
                                  <Chip 
                                    label={finding.status}
                                    size="small"
                                    color={finding.status === 'CONFIRMED' ? 'success' : 'default'}
                                  />
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Timeline Section */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Timeline ({detailData.getInvestigation.timeline.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {detailData.getInvestigation.timeline.length === 0 ? (
                    <Alert severity="info">No timeline events recorded yet</Alert>
                  ) : (
                    <List>
                      {detailData.getInvestigation.timeline.map((entry) => (
                        <ListItem key={entry.id} divider>
                          <ListItemIcon>
                            <Timeline />
                          </ListItemIcon>
                          <ListItemText
                            primary={entry.title}
                            secondary={
                              <Box>
                                <Typography variant="body2">{entry.description}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(entry.timestamp).toLocaleString()} • {entry.actor}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Alert severity="error">Investigation not found</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Evidence Dialog */}
      <Dialog open={evidenceDialogOpen} onClose={() => setEvidenceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Evidence</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Evidence Type</InputLabel>
                <Select
                  value={newEvidence.type}
                  label="Evidence Type"
                  onChange={(e) => setNewEvidence(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="DIGITAL_ARTIFACT">Digital Artifact</MenuItem>
                  <MenuItem value="NETWORK_LOG">Network Log</MenuItem>
                  <MenuItem value="SYSTEM_LOG">System Log</MenuItem>
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="DOCUMENT">Document</MenuItem>
                  <MenuItem value="IMAGE">Image</MenuItem>
                  <MenuItem value="VIDEO">Video</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newEvidence.title}
                onChange={(e) => setNewEvidence(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newEvidence.description}
                onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Source"
                value={newEvidence.source}
                onChange={(e) => setNewEvidence(prev => ({ ...prev, source: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvidenceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddEvidence} variant="contained">Add Evidence</Button>
        </DialogActions>
      </Dialog>

      {/* Add Finding Dialog */}
      <Dialog open={findingDialogOpen} onClose={() => setFindingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Finding</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newFinding.title}
                onChange={(e) => setNewFinding(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newFinding.description}
                onChange={(e) => setNewFinding(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newFinding.severity}
                  label="Severity"
                  onChange={(e) => setNewFinding(prev => ({ ...prev, severity: e.target.value }))}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newFinding.category}
                  label="Category"
                  onChange={(e) => setNewFinding(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="MALWARE">Malware</MenuItem>
                  <MenuItem value="PHISHING">Phishing</MenuItem>
                  <MenuItem value="DATA_BREACH">Data Breach</MenuItem>
                  <MenuItem value="INSIDER_THREAT">Insider Threat</MenuItem>
                  <MenuItem value="APT">APT</MenuItem>
                  <MenuItem value="FRAUD">Fraud</MenuItem>
                  <MenuItem value="VULNERABILITY">Vulnerability</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindingDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddFinding} variant="contained">Add Finding</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvestigationWorkflowPanel;