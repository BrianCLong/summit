import React, { useEffect, useState } from 'react';
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
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  CardContent,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  PersonOutlined as PlannerIcon,
  PsychologyOutlined as CriticIcon,
  BuildOutlined as ExecutorIcon,
  CheckCircleOutlined as ApprovedIcon,
  BlockOutlined as BlockedIcon,
  PendingOutlined as PendingIcon,
  EditOutlined as EditIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTimeOutlined as TimeIcon,
  PersonOutlined as UserIcon,
  SmartToyOutlined as AgentIcon,
  PlayArrowOutlined as ExecuteIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface AgentStep {
  id: string;
  role: 'planner' | 'critic' | 'executor' | 'human';
  state:
    | 'pending'
    | 'running'
    | 'need_approval'
    | 'approved'
    | 'blocked'
    | 'completed'
    | 'error';
  text: string;
  ts: number;
  metadata?: {
    duration?: number;
    cost?: number;
    confidence?: number;
    tools_used?: string[];
    checkpoint_type?: string;
    user_action?: string;
    edit_history?: {
      timestamp: number;
      original: string;
      edited: string;
      reason?: string;
    }[];
  };
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
}

interface EditDialogProps {
  open: boolean;
  step: AgentStep | null;
  onClose: () => void;
  onSave: (stepId: string, editedText: string, reason?: string) => void;
}

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  step,
  onClose,
  onSave,
}) => {
  const [editedText, setEditedText] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (step) {
      setEditedText(step.text);
      setReason('');
    }
  }, [step]);

  const handleSave = () => {
    if (step) {
      onSave(step.id, editedText, reason);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Agent Step</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Original Text:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {step?.text}
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={6}
          label="Edited Text"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Reason for Edit (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why you're making this change..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!editedText.trim()}
        >
          Save & Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function AgentTimeline({ runId }: { runId: string }) {
  const { getAgentSteps, streamAgent, actOnAgent } = api();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<AgentStep | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await getAgentSteps(runId);
        setSteps(r.steps || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load agent steps',
        );
      } finally {
        setLoading(false);
      }

      const off = streamAgent(runId, (s) =>
        setSteps((x) => {
          const nx = x.filter((y) => y.id !== s.id);
          return [...nx, s].sort((a, b) => a.ts - b.ts);
        }),
      );
      return () => off();
    })();
  }, [runId, getAgentSteps, streamAgent]);

  const handleAction = async (
    stepId: string,
    action: 'approve' | 'block',
    editedText?: string,
    reason?: string,
  ) => {
    try {
      await actOnAgent(runId, {
        stepId,
        action,
        patch: editedText,
        reason,
      });

      // Update local state optimistically
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                state: action === 'approve' ? 'approved' : 'blocked',
                text: editedText || step.text,
                metadata: {
                  ...step.metadata,
                  user_action: action,
                  edit_history:
                    editedText && editedText !== step.text
                      ? [
                          ...(step.metadata?.edit_history || []),
                          {
                            timestamp: Date.now(),
                            original: step.text,
                            edited: editedText,
                            reason,
                          },
                        ]
                      : step.metadata?.edit_history,
                },
              }
            : step,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleEdit = (step: AgentStep) => {
    setSelectedStep(step);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (
    stepId: string,
    editedText: string,
    reason?: string,
  ) => {
    handleAction(stepId, 'approve', editedText, reason);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'planner':
        return <PlannerIcon />;
      case 'critic':
        return <CriticIcon />;
      case 'executor':
        return <ExecutorIcon />;
      case 'human':
        return <UserIcon />;
      default:
        return <AgentIcon />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'approved':
        return 'success';
      case 'blocked':
        return 'error';
      case 'need_approval':
        return 'warning';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'blocked':
        return <BlockedIcon color="error" />;
      case 'need_approval':
        return <PendingIcon color="warning" />;
      case 'running':
        return <ExecuteIcon color="primary" />;
      default:
        return <PendingIcon />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const renderStepActions = (step: AgentStep) => {
    if (step.state !== 'need_approval') return null;

    return (
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<ApprovedIcon />}
          onClick={() => handleAction(step.id, 'approve')}
        >
          Approve
        </Button>

        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<BlockedIcon />}
          onClick={() => handleAction(step.id, 'block')}
        >
          Block
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          onClick={() => handleEdit(step)}
        >
          Edit & Approve
        </Button>
      </Box>
    );
  };

  const renderStepMetadata = (step: AgentStep) => {
    if (!step.metadata) return null;

    const { duration, cost, confidence, tools_used, edit_history } =
      step.metadata;

    return (
      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" color="textSecondary">
            Step Details
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              mb: 2,
            }}
          >
            {duration && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Duration
                </Typography>
                <Typography variant="body2">
                  {formatDuration(duration)}
                </Typography>
              </Box>
            )}

            {cost && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Cost
                </Typography>
                <Typography variant="body2">${cost.toFixed(4)}</Typography>
              </Box>
            )}

            {confidence && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Confidence
                </Typography>
                <Typography variant="body2">
                  {(confidence * 100).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>

          {tools_used && tools_used.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                gutterBottom
              >
                Tools Used
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {tools_used.map((tool, index) => (
                  <Chip
                    key={index}
                    label={tool}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {edit_history && edit_history.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                gutterBottom
              >
                Edit History
              </Typography>
              <List dense>
                {edit_history.map((edit, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`Edit ${index + 1}`}
                      secondary={`${new Date(edit.timestamp).toLocaleString()}${edit.reason ? ` - ${edit.reason}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {step.inputs && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Inputs</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  component="pre"
                  sx={{ fontSize: '0.75rem', overflow: 'auto' }}
                >
                  {JSON.stringify(step.inputs, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {step.outputs && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Outputs</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  component="pre"
                  sx={{ fontSize: '0.75rem', overflow: 'auto' }}
                >
                  {JSON.stringify(step.outputs, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading agent timeline...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load agent timeline: {error}
      </Alert>
    );
  }

  const sortedSteps = steps.sort((a, b) => a.ts - b.ts);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AgentIcon />
        <Typography variant="h6">Agent Timeline</Typography>
        <Chip label={`${steps.length} steps`} size="small" color="primary" />
      </Box>

      {sortedSteps.length === 0 && (
        <Alert severity="info">
          No agent steps yet. The agent timeline will populate as the run
          progresses.
        </Alert>
      )}

      <Timeline>
        {sortedSteps.map((step, index) => (
          <TimelineItem key={step.id}>
            <TimelineOppositeContent
              color="textSecondary"
              sx={{ flex: '0 1 auto' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon fontSize="small" />
                <Typography variant="caption">
                  {new Date(step.ts).toLocaleTimeString()}
                </Typography>
              </Box>
              {step.metadata?.duration && (
                <Typography variant="caption" color="textSecondary">
                  {formatDuration(step.metadata.duration)}
                </Typography>
              )}
            </TimelineOppositeContent>

            <TimelineSeparator>
              <TimelineDot color={getStateColor(step.state)}>
                {getRoleIcon(step.role)}
              </TimelineDot>
              {index < sortedSteps.length - 1 && <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {step.role}
                      </Typography>
                      {step.metadata?.checkpoint_type && (
                        <Chip
                          label={step.metadata.checkpoint_type}
                          size="small"
                          color="info"
                        />
                      )}
                    </Box>

                    <Tooltip title={step.state}>
                      <Chip
                        icon={getStateIcon(step.state)}
                        label={step.state.replace('_', ' ')}
                        color={getStateColor(step.state)}
                        size="small"
                      />
                    </Tooltip>
                  </Box>

                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      mb: 1,
                    }}
                  >
                    {step.text}
                  </Typography>

                  {step.error && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      <Typography variant="body2">{step.error}</Typography>
                    </Alert>
                  )}

                  {renderStepActions(step)}
                  {renderStepMetadata(step)}
                </CardContent>
              </Card>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      <EditDialog
        open={editDialogOpen}
        step={selectedStep}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveEdit}
      />
    </Box>
  );
}
