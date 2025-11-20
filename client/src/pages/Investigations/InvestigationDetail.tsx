// @ts-nocheck
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
import { useI18n } from '../../hooks/useI18n';

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
    <div role="tabpanel" hidden={value !== index} aria-labelledby={`tab-${index}`}>
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
  const { t, formatDate } = useI18n();
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
        <Typography sx={{ mt: 2 }}>{t('investigation.loading')}</Typography>
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
                    {t('investigation.caseId')} {investigation.id}
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
                    {t('investigation.created')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(investigation.createdAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('investigation.lastUpdated')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(investigation.lastUpdated)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('investigation.progress')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={investigation.progress}
                      aria-label={t('investigation.progress')}
                      aria-valuenow={investigation.progress}
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
                <Tooltip title={t('investigation.share')}>
                  <IconButton aria-label={t('investigation.share')}>
                    <Share />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('investigation.exportReport')}>
                  <IconButton aria-label={t('investigation.exportReport')}>
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('investigation.edit')}>
                  <IconButton aria-label={t('investigation.edit')}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('investigation.assignedTeam')}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {investigation.assignedTo.map((person) => (
                    <Avatar key={person} sx={{ width: 32, height: 32 }} aria-label={person}>
                      {person
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Avatar>
                  ))}
                  <IconButton size="small" sx={{ width: 32, height: 32 }} aria-label={t('common.add')}>
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
          aria-label="Investigation tabs"
        >
          <Tab
            icon={<AttachFile />}
            label={`Evidence (${investigation.evidence.length})`}
            id="tab-0"
            aria-controls="tabpanel-0"
          />
          <Tab
            icon={<Group />}
            label={`Entities (${investigation.entities.length})`}
            id="tab-1"
            aria-controls="tabpanel-1"
          />
          <Tab icon={<TimelineIcon />} label={t('investigation.timeline')} id="tab-2" aria-controls="tabpanel-2" />
          <Tab
            icon={<Comment />}
            label={`Notes (${investigation.notes.length})`}
            id="tab-3"
            aria-controls="tabpanel-3"
          />
          <Tab icon={<AccountTree />} label={t('investigation.entityRelationships')} id="tab-4" aria-controls="tabpanel-4" />
          <Tab icon={<Assessment />} label={t('investigation.analysis')} id="tab-5" aria-controls="tabpanel-5" />
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
              <Typography variant="h6">{t('investigation.evidenceManagement')}</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddEvidenceOpen(true)}
              >
                {t('investigation.addEvidence')}
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
                                {t('investigation.chainOfCustody')} ({evidence.chain.length}{' '}
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
                            <IconButton aria-label="View Evidence">
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton aria-label="Download">
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
              {t('investigation.connectedEntities')}
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
                          aria-hidden="true"
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
              {t('investigation.timeline')}
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
              <Typography variant="h6">{t('investigation.notes')}</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddNoteOpen(true)}
              >
                {t('investigation.addNote')}
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
              {t('investigation.entityRelationships')}
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              {t('investigation.relationshipGraphDesc')}
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
                  {t('investigation.relationshipGraph')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('investigation.relationshipGraphDesc')}
                </Typography>
              </Stack>
            </Paper>
          </CardContent>
        </TabPanel>

        {/* Analysis Tab */}
        <TabPanel value={selectedTab} index={5}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('investigation.analysis')}
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {t('investigation.riskAssessment')}
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">
                            {t('investigation.overallRisk')}
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
                            {t('investigation.evidenceStrength')}
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
                      {t('investigation.keyFindings')}
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
        aria-labelledby="add-evidence-dialog-title"
      >
        <DialogTitle id="add-evidence-dialog-title">{t('investigation.dialog.addEvidence')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField fullWidth label={t('investigation.label.evidenceName')} />
            <FormControl fullWidth>
              <InputLabel>{t('investigation.label.evidenceType')}</InputLabel>
              <Select label={t('investigation.label.evidenceType')}>
                <MenuItem value="DOCUMENT">Document</MenuItem>
                <MenuItem value="DIGITAL">Digital Evidence</MenuItem>
                <MenuItem value="PHYSICAL">Physical Evidence</MenuItem>
                <MenuItem value="TESTIMONY">Testimony</MenuItem>
                <MenuItem value="FORENSIC">Forensic Analysis</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label={t('investigation.label.description')} multiline rows={3} />
            <TextField fullWidth label={t('investigation.label.location')} />
            <TextField fullWidth label={t('investigation.label.custodyNotes')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEvidenceOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained">{t('investigation.addEvidence')}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="add-note-dialog-title"
      >
        <DialogTitle id="add-note-dialog-title">{t('investigation.dialog.addNote')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('investigation.label.classification')}</InputLabel>
              <Select label={t('investigation.label.classification')}>
                <MenuItem value="UNCLASSIFIED">Unclassified</MenuItem>
                <MenuItem value="CONFIDENTIAL">Confidential</MenuItem>
                <MenuItem value="SECRET">Secret</MenuItem>
                <MenuItem value="TOP_SECRET">Top Secret</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('investigation.label.noteContent')}
              multiline
              rows={6}
              placeholder={t('investigation.placeholder.enterNotes')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNoteOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained">{t('investigation.addNote')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
