import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Grid,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ChipProps,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Gavel,
  Person,
  AttachFile,
  Comment,
  Share,
  Download,
  Edit,
  Add,
  Security,
  Warning,
  CheckCircle,
  Visibility,
  ExpandMore,
  AccountTree,
  Timeline as TimelineIcon,
  Assessment,
  Group,
  Assignment,
  Flag,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSafeQuery } from '../../hooks/useSafeQuery';

interface Investigation {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'CLOSED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  createdAt: string;
  lastUpdated: string;
  assignedTo: string[];
  description: string;
  stage: 'INITIATE' | 'COLLECT' | 'ANALYZE' | 'DISSEMINATE' | 'EVALUATE';
  progress: number;
  evidence: Evidence[];
  entities: Entity[];
  timeline: TimelineEvent[];
  notes: Note[];
  tags: string[];
}

interface Evidence {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'DIGITAL' | 'PHYSICAL' | 'TESTIMONY' | 'FORENSIC';
  size: string;
  hash: string;
  addedBy: string;
  addedAt: string;
  chain: ChainEntry[];
}

interface Entity {
  id: string;
  name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'ASSET';
  risk: number;
  connections: number;
}

interface TimelineEvent {
  id: string;
  type:
    | 'CREATED'
    | 'EVIDENCE_ADDED'
    | 'NOTE_ADDED'
    | 'STATUS_CHANGED'
    | 'ASSIGNED';
  description: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface Note {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  classification: string;
}

interface ChainEntry {
  actor: string;
  action: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const getStatusColor = (
  status: Investigation['status'],
): ChipProps['color'] => {
  switch (status) {
    case 'OPEN':
      return 'info';
    case 'IN_PROGRESS':
      return 'warning';
    case 'REVIEW':
      return 'primary';
    case 'CLOSED':
      return 'success';
    case 'ARCHIVED':
      return 'default';
    default:
      return 'default';
  }
};

const getPriorityColor = (
  priority: Investigation['priority'],
): ChipProps['color'] => {
  switch (priority) {
    case 'CRITICAL':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
      return 'success';
    default:
      return 'default';
  }
};

const getClassificationColor = (
  classification: Investigation['classification'],
) => {
  switch (classification) {
    case 'TOP_SECRET':
      return '#FF0000';
    case 'SECRET':
      return '#FFA500';
    case 'CONFIDENTIAL':
      return '#0000FF';
    case 'UNCLASSIFIED':
      return '#008000';
    default:
      return '#008000';
  }
};

export default function InvestigationDetail() {
  const { id } = useParams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);

  const { data: investigation, loading } = useSafeQuery<Investigation>({
    queryKey: `investigation_${id}`,
    mock: {
      id: id || 'INV-2025-089',
      title: 'Financial Fraud Investigation - TechCorp Subsidiary',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      classification: 'CONFIDENTIAL',
      createdAt: '2025-08-25T09:00:00Z',
      lastUpdated: '2025-08-27T03:45:00Z',
      assignedTo: ['John Smith', 'Sarah Johnson', 'Mike Davis'],
      description:
        'Investigation into suspected financial fraud involving shell companies and wire transfers through offshore accounts. Multiple entities identified with suspicious transaction patterns exceeding $2.5M in aggregate.',
      stage: 'ANALYZE',
      progress: 65,
      evidence: [
        {
          id: 'E001',
          name: 'Bank Transaction Records Q3 2025.xlsx',
          type: 'DOCUMENT',
          size: '2.4 MB',
          hash: 'sha256:a1b2c3d4e5f6...',
          addedBy: 'John Smith',
          addedAt: '2025-08-25T10:30:00Z',
          chain: [
            {
              actor: 'John Smith',
              action: 'Added to investigation',
              timestamp: '2025-08-25T10:30:00Z',
              location: 'Evidence Room A',
            },
            {
              actor: 'Sarah Johnson',
              action: 'Reviewed and verified',
              timestamp: '2025-08-25T14:20:00Z',
            },
          ],
        },
        {
          id: 'E002',
          name: 'Email Communications Archive.pst',
          type: 'DIGITAL',
          size: '156 MB',
          hash: 'sha256:f6e5d4c3b2a1...',
          addedBy: 'Mike Davis',
          addedAt: '2025-08-26T08:15:00Z',
          chain: [
            {
              actor: 'Mike Davis',
              action: 'Extracted from server',
              timestamp: '2025-08-26T08:15:00Z',
              location: 'IT Forensics Lab',
            },
            {
              actor: 'Digital Forensics Team',
              action: 'Hash verified',
              timestamp: '2025-08-26T09:45:00Z',
            },
          ],
        },
        {
          id: 'E003',
          name: 'Witness Statement - CFO Interview',
          type: 'TESTIMONY',
          size: '1.2 MB',
          hash: 'sha256:9a8b7c6d5e4f...',
          addedBy: 'Sarah Johnson',
          addedAt: '2025-08-27T02:00:00Z',
          chain: [
            {
              actor: 'Sarah Johnson',
              action: 'Interview conducted',
              timestamp: '2025-08-27T02:00:00Z',
              location: 'Conference Room B',
            },
          ],
        },
      ],
      entities: [
        {
          id: 'P001',
          name: 'Robert Chen',
          type: 'PERSON',
          risk: 85,
          connections: 12,
        },
        {
          id: 'O001',
          name: 'Offshore Holdings LLC',
          type: 'ORGANIZATION',
          risk: 92,
          connections: 8,
        },
        {
          id: 'O002',
          name: 'TechCorp Financial Services',
          type: 'ORGANIZATION',
          risk: 45,
          connections: 24,
        },
        {
          id: 'L001',
          name: 'Cayman Islands Office',
          type: 'LOCATION',
          risk: 70,
          connections: 6,
        },
      ],
      timeline: [
        {
          id: 'T001',
          type: 'CREATED',
          description: 'Investigation opened following compliance alert',
          actor: 'Compliance Team',
          timestamp: '2025-08-25T09:00:00Z',
        },
        {
          id: 'T002',
          type: 'ASSIGNED',
          description: 'Case assigned to Financial Crimes Unit',
          actor: 'Case Manager',
          timestamp: '2025-08-25T09:30:00Z',
        },
        {
          id: 'T003',
          type: 'EVIDENCE_ADDED',
          description: 'Bank transaction records added to evidence',
          actor: 'John Smith',
          timestamp: '2025-08-25T10:30:00Z',
        },
        {
          id: 'T004',
          type: 'STATUS_CHANGED',
          description: 'Status changed from OPEN to IN_PROGRESS',
          actor: 'Lead Investigator',
          timestamp: '2025-08-25T11:00:00Z',
        },
      ],
      notes: [
        {
          id: 'N001',
          author: 'John Smith',
          content:
            'Initial analysis reveals pattern of structured transactions just below CTR thresholds. Multiple wire transfers to same beneficial owner through different shell entities.',
          timestamp: '2025-08-25T16:20:00Z',
          classification: 'CONFIDENTIAL',
        },
        {
          id: 'N002',
          author: 'Sarah Johnson',
          content:
            'CFO interview reveals knowledge of unusual transaction patterns but claims no direct involvement. Recommended further investigation into accounting practices.',
          timestamp: '2025-08-27T03:15:00Z',
          classification: 'CONFIDENTIAL',
        },
      ],
      tags: [
        'Financial Fraud',
        'Money Laundering',
        'Shell Companies',
        'Offshore Banking',
        'CTR Evasion',
      ],
    },
    deps: [id],
  });

  if (loading || !investigation) {
    return (
      <Box sx={{ m: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading investigation...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ m: 2 }}>
      {/* Investigation Header */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Gavel sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {investigation.title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Case ID: {investigation.id}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  label={investigation.status}
                  color={getStatusColor(investigation.status)}
                  variant="filled"
                />
                <Chip
                  label={investigation.priority}
                  color={getPriorityColor(investigation.priority)}
                  variant="outlined"
                />
                <Chip
                  label={investigation.classification}
                  sx={{
                    backgroundColor: getClassificationColor(
                      investigation.classification,
                    ),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                <Chip label={investigation.stage} variant="outlined" />
              </Stack>

              <Typography variant="body1" paragraph>
                {investigation.description}
              </Typography>

              <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(investigation.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(investigation.lastUpdated).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Progress
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={investigation.progress}
                      sx={{ width: 100, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2">
                      {investigation.progress}%
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {investigation.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>

            <Stack spacing={2} alignItems="flex-end">
              <Stack direction="row" spacing={1}>
                <Tooltip title="Share Investigation">
                  <IconButton>
                    <Share />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Report">
                  <IconButton>
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Investigation">
                  <IconButton>
                    <Edit />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Assigned Team
                </Typography>
                <Stack direction="row" spacing={1}>
                  {investigation.assignedTo.map((person) => (
                    <Avatar key={person} sx={{ width: 32, height: 32 }}>
                      {person
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Avatar>
                  ))}
                  <IconButton size="small" sx={{ width: 32, height: 32 }}>
                    <Add />
                  </IconButton>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card sx={{ borderRadius: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<AttachFile />}
            label={`Evidence (${investigation.evidence.length})`}
          />
          <Tab
            icon={<Group />}
            label={`Entities (${investigation.entities.length})`}
          />
          <Tab icon={<TimelineIcon />} label="Timeline" />
          <Tab
            icon={<Comment />}
            label={`Notes (${investigation.notes.length})`}
          />
          <Tab icon={<AccountTree />} label="Relationships" />
          <Tab icon={<Assessment />} label="Analysis" />
        </Tabs>

        {/* Evidence Tab */}
        <TabPanel value={selectedTab} index={0}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6">Evidence Management</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddEvidenceOpen(true)}
              >
                Add Evidence
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {investigation.evidence.map((evidence) => (
                <Grid item xs={12} key={evidence.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box sx={{ flex: 1 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                          >
                            <AttachFile color="primary" />
                            <Box>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 'bold' }}
                              >
                                {evidence.name}
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                <Chip
                                  label={evidence.type}
                                  size="small"
                                  variant="outlined"
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {evidence.size} • Added by {evidence.addedBy}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>

                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace',
                              mt: 1,
                              display: 'block',
                            }}
                          >
                            Hash: {evidence.hash}
                          </Typography>

                          <Accordion sx={{ mt: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Typography variant="body2">
                                Chain of Custody ({evidence.chain.length}{' '}
                                entries)
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Timeline>
                                {evidence.chain.map((entry, index) => (
                                  <TimelineItem key={index}>
                                    <TimelineSeparator>
                                      <TimelineDot color="primary" />
                                      {index < evidence.chain.length - 1 && (
                                        <TimelineConnector />
                                      )}
                                    </TimelineSeparator>
                                    <TimelineContent>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 'bold' }}
                                      >
                                        {entry.action}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {entry.actor} •{' '}
                                        {new Date(
                                          entry.timestamp,
                                        ).toLocaleString()}
                                        {entry.location &&
                                          ` • ${entry.location}`}
                                      </Typography>
                                      {entry.notes && (
                                        <Typography
                                          variant="body2"
                                          sx={{ mt: 0.5 }}
                                        >
                                          {entry.notes}
                                        </Typography>
                                      )}
                                    </TimelineContent>
                                  </TimelineItem>
                                ))}
                              </Timeline>
                            </AccordionDetails>
                          </Accordion>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Evidence">
                            <IconButton>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton>
                              <Download />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Entities Tab */}
        <TabPanel value={selectedTab} index={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Connected Entities
            </Typography>

            <Grid container spacing={2}>
              {investigation.entities.map((entity) => (
                <Grid item xs={12} sm={6} md={4} key={entity.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor:
                              entity.risk > 70
                                ? 'error.main'
                                : entity.risk > 40
                                  ? 'warning.main'
                                  : 'success.main',
                          }}
                        >
                          {entity.type === 'PERSON' ? (
                            <Person />
                          ) : entity.type === 'ORGANIZATION' ? (
                            <Assignment />
                          ) : (
                            <Flag />
                          )}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 'bold' }}
                          >
                            {entity.name}
                          </Typography>
                          <Stack direction="row" justifyContent="space-between">
                            <Chip
                              label={entity.type}
                              size="small"
                              variant="outlined"
                            />
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Typography variant="caption">
                                Risk: {entity.risk}%
                              </Typography>
                              <Typography variant="caption">
                                Links: {entity.connections}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={selectedTab} index={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Investigation Timeline
            </Typography>

            <Timeline>
              {investigation.timeline.map((event, index) => (
                <TimelineItem key={event.id}>
                  <TimelineOppositeContent sx={{ flex: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.timestamp).toLocaleString()}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot
                      color={
                        event.type === 'CREATED'
                          ? 'primary'
                          : event.type === 'EVIDENCE_ADDED'
                            ? 'success'
                            : event.type === 'STATUS_CHANGED'
                              ? 'warning'
                              : 'info'
                      }
                    >
                      {event.type === 'CREATED' && <Add />}
                      {event.type === 'EVIDENCE_ADDED' && <AttachFile />}
                      {event.type === 'STATUS_CHANGED' && <Edit />}
                      {event.type === 'ASSIGNED' && <Person />}
                      {event.type === 'NOTE_ADDED' && <Comment />}
                    </TimelineDot>
                    {index < investigation.timeline.length - 1 && (
                      <TimelineConnector />
                    )}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {event.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {event.actor}
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel value={selectedTab} index={3}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6">Investigation Notes</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddNoteOpen(true)}
              >
                Add Note
              </Button>
            </Stack>

            <Stack spacing={2}>
              {investigation.notes.map((note) => (
                <Card key={note.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box sx={{ flex: 1 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={2}
                          sx={{ mb: 1 }}
                        >
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {note.author
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {note.author}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(note.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={note.classification}
                            size="small"
                            sx={{
                              backgroundColor: getClassificationColor(
                                note.classification as Investigation['classification'],
                              ),
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          />
                        </Stack>
                        <Typography variant="body2">{note.content}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </TabPanel>

        {/* Relationships Tab */}
        <TabPanel value={selectedTab} index={4}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Entity Relationships
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Interactive relationship graph showing connections between
              entities in this investigation.
            </Alert>

            <Paper
              variant="outlined"
              sx={{
                height: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
              }}
            >
              <Stack alignItems="center">
                <AccountTree sx={{ fontSize: 64, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  Relationship Graph
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Interactive network visualization of entity connections
                </Typography>
              </Stack>
            </Paper>
          </CardContent>
        </TabPanel>

        {/* Analysis Tab */}
        <TabPanel value={selectedTab} index={5}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Investigation Analysis
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Risk Assessment
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">
                            Overall Risk Level
                          </Typography>
                          <Typography
                            variant="body2"
                            color="error.main"
                            fontWeight="bold"
                          >
                            HIGH
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={78}
                          color="error"
                          sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">
                            Evidence Strength
                          </Typography>
                          <Typography
                            variant="body2"
                            color="warning.main"
                            fontWeight="bold"
                          >
                            MEDIUM
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={65}
                          color="warning"
                          sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Key Findings
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Warning color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Structured Transaction Pattern"
                          secondary="Multiple transactions just below CTR thresholds"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Security color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Shell Company Network"
                          secondary="Complex ownership structure obscuring beneficial owners"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Digital Evidence Verified"
                          secondary="All hash values confirmed, chain of custody intact"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>
      </Card>

      {/* Add Evidence Dialog */}
      <Dialog
        open={addEvidenceOpen}
        onClose={() => setAddEvidenceOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Evidence to Investigation</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField fullWidth label="Evidence Name" />
            <FormControl fullWidth>
              <InputLabel>Evidence Type</InputLabel>
              <Select label="Evidence Type">
                <MenuItem value="DOCUMENT">Document</MenuItem>
                <MenuItem value="DIGITAL">Digital Evidence</MenuItem>
                <MenuItem value="PHYSICAL">Physical Evidence</MenuItem>
                <MenuItem value="TESTIMONY">Testimony</MenuItem>
                <MenuItem value="FORENSIC">Forensic Analysis</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Description" multiline rows={3} />
            <TextField fullWidth label="Location/Source" />
            <TextField fullWidth label="Chain of Custody Notes" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEvidenceOpen(false)}>Cancel</Button>
          <Button variant="contained">Add Evidence</Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Investigation Note</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Classification Level</InputLabel>
              <Select label="Classification Level">
                <MenuItem value="UNCLASSIFIED">Unclassified</MenuItem>
                <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                <MenuItem value="SECRET">Secret</MenuItem>
                <MenuItem value="TOP_SECRET">Top Secret</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Note Content"
              multiline
              rows={6}
              placeholder="Enter your investigation notes..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNoteOpen(false)}>Cancel</Button>
          <Button variant="contained">Add Note</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
