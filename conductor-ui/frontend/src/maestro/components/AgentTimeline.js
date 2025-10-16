import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
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
const EditDialog = ({ open, step, onClose, onSave }) => {
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
  return _jsxs(Dialog, {
    open: open,
    onClose: onClose,
    maxWidth: 'md',
    fullWidth: true,
    children: [
      _jsx(DialogTitle, { children: 'Edit Agent Step' }),
      _jsxs(DialogContent, {
        children: [
          _jsxs(Box, {
            sx: { mb: 2 },
            children: [
              _jsx(Typography, {
                variant: 'subtitle2',
                gutterBottom: true,
                children: 'Original Text:',
              }),
              _jsx(Box, {
                sx: { p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 },
                children: _jsx(Typography, {
                  variant: 'body2',
                  component: 'pre',
                  sx: { whiteSpace: 'pre-wrap' },
                  children: step?.text,
                }),
              }),
            ],
          }),
          _jsx(TextField, {
            fullWidth: true,
            multiline: true,
            rows: 6,
            label: 'Edited Text',
            value: editedText,
            onChange: (e) => setEditedText(e.target.value),
            sx: { mb: 2 },
          }),
          _jsx(TextField, {
            fullWidth: true,
            label: 'Reason for Edit (optional)',
            value: reason,
            onChange: (e) => setReason(e.target.value),
            placeholder: "Explain why you're making this change...",
          }),
        ],
      }),
      _jsxs(DialogActions, {
        children: [
          _jsx(Button, { onClick: onClose, children: 'Cancel' }),
          _jsx(Button, {
            variant: 'contained',
            onClick: handleSave,
            disabled: !editedText.trim(),
            children: 'Save & Approve',
          }),
        ],
      }),
    ],
  });
};
export default function AgentTimeline({ runId }) {
  const { getAgentSteps, streamAgent, actOnAgent } = api();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        setLoading(true);
        const r = await getAgentSteps(runId);
        setSteps(r.steps || []);
        setCheckpoints(r.checkpoints || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load agent steps',
        );
      } finally {
        setLoading(false);
      }
      off = streamAgent(runId, (s) =>
        setSteps((x) => {
          const nx = x.filter((y) => y.id !== s.id);
          return [...nx, s].sort((a, b) => a.ts - b.ts);
        }),
      );
    })();
    return () => off();
  }, [runId]);
  const handleAction = async (stepId, action, editedText, reason) => {
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
  const handleEdit = (step) => {
    setSelectedStep(step);
    setEditDialogOpen(true);
  };
  const handleSaveEdit = (stepId, editedText, reason) => {
    handleAction(stepId, 'approve', editedText, reason);
  };
  const getRoleIcon = (role) => {
    switch (role) {
      case 'planner':
        return _jsx(PlannerIcon, {});
      case 'critic':
        return _jsx(CriticIcon, {});
      case 'executor':
        return _jsx(ExecutorIcon, {});
      case 'human':
        return _jsx(UserIcon, {});
      default:
        return _jsx(AgentIcon, {});
    }
  };
  const getStateColor = (state) => {
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
  const getStateIcon = (state) => {
    switch (state) {
      case 'approved':
        return _jsx(ApprovedIcon, { color: 'success' });
      case 'blocked':
        return _jsx(BlockedIcon, { color: 'error' });
      case 'need_approval':
        return _jsx(PendingIcon, { color: 'warning' });
      case 'running':
        return _jsx(ExecuteIcon, { color: 'primary' });
      default:
        return _jsx(PendingIcon, {});
    }
  };
  const formatDuration = (ms) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  const renderStepActions = (step) => {
    if (step.state !== 'need_approval') return null;
    return _jsxs(Box, {
      sx: { mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' },
      children: [
        _jsx(Button, {
          variant: 'contained',
          color: 'success',
          size: 'small',
          startIcon: _jsx(ApprovedIcon, {}),
          onClick: () => handleAction(step.id, 'approve'),
          children: 'Approve',
        }),
        _jsx(Button, {
          variant: 'contained',
          color: 'error',
          size: 'small',
          startIcon: _jsx(BlockedIcon, {}),
          onClick: () => handleAction(step.id, 'block'),
          children: 'Block',
        }),
        _jsx(Button, {
          variant: 'outlined',
          size: 'small',
          startIcon: _jsx(EditIcon, {}),
          onClick: () => handleEdit(step),
          children: 'Edit & Approve',
        }),
      ],
    });
  };
  const renderStepMetadata = (step) => {
    if (!step.metadata) return null;
    const { duration, cost, confidence, tools_used, edit_history } =
      step.metadata;
    return _jsxs(Accordion, {
      sx: { mt: 1 },
      children: [
        _jsx(AccordionSummary, {
          expandIcon: _jsx(ExpandMoreIcon, {}),
          children: _jsx(Typography, {
            variant: 'body2',
            color: 'textSecondary',
            children: 'Step Details',
          }),
        }),
        _jsxs(AccordionDetails, {
          children: [
            _jsxs(Box, {
              sx: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                mb: 2,
              },
              children: [
                duration &&
                  _jsxs(Box, {
                    children: [
                      _jsx(Typography, {
                        variant: 'caption',
                        color: 'textSecondary',
                        children: 'Duration',
                      }),
                      _jsx(Typography, {
                        variant: 'body2',
                        children: formatDuration(duration),
                      }),
                    ],
                  }),
                cost &&
                  _jsxs(Box, {
                    children: [
                      _jsx(Typography, {
                        variant: 'caption',
                        color: 'textSecondary',
                        children: 'Cost',
                      }),
                      _jsxs(Typography, {
                        variant: 'body2',
                        children: ['$', cost.toFixed(4)],
                      }),
                    ],
                  }),
                confidence &&
                  _jsxs(Box, {
                    children: [
                      _jsx(Typography, {
                        variant: 'caption',
                        color: 'textSecondary',
                        children: 'Confidence',
                      }),
                      _jsxs(Typography, {
                        variant: 'body2',
                        children: [(confidence * 100).toFixed(1), '%'],
                      }),
                    ],
                  }),
              ],
            }),
            tools_used &&
              tools_used.length > 0 &&
              _jsxs(Box, {
                sx: { mb: 2 },
                children: [
                  _jsx(Typography, {
                    variant: 'caption',
                    color: 'textSecondary',
                    display: 'block',
                    gutterBottom: true,
                    children: 'Tools Used',
                  }),
                  _jsx(Box, {
                    sx: { display: 'flex', gap: 0.5, flexWrap: 'wrap' },
                    children: tools_used.map((tool, index) =>
                      _jsx(
                        Chip,
                        { label: tool, size: 'small', variant: 'outlined' },
                        index,
                      ),
                    ),
                  }),
                ],
              }),
            edit_history &&
              edit_history.length > 0 &&
              _jsxs(Box, {
                children: [
                  _jsx(Typography, {
                    variant: 'caption',
                    color: 'textSecondary',
                    display: 'block',
                    gutterBottom: true,
                    children: 'Edit History',
                  }),
                  _jsx(List, {
                    dense: true,
                    children: edit_history.map((edit, index) =>
                      _jsx(
                        ListItem,
                        {
                          children: _jsx(ListItemText, {
                            primary: `Edit ${index + 1}`,
                            secondary: `${new Date(edit.timestamp).toLocaleString()}${edit.reason ? ` - ${edit.reason}` : ''}`,
                          }),
                        },
                        index,
                      ),
                    ),
                  }),
                ],
              }),
            step.inputs &&
              _jsxs(Accordion, {
                children: [
                  _jsx(AccordionSummary, {
                    expandIcon: _jsx(ExpandMoreIcon, {}),
                    children: _jsx(Typography, {
                      variant: 'body2',
                      children: 'Inputs',
                    }),
                  }),
                  _jsx(AccordionDetails, {
                    children: _jsx(Box, {
                      component: 'pre',
                      sx: { fontSize: '0.75rem', overflow: 'auto' },
                      children: JSON.stringify(step.inputs, null, 2),
                    }),
                  }),
                ],
              }),
            step.outputs &&
              _jsxs(Accordion, {
                children: [
                  _jsx(AccordionSummary, {
                    expandIcon: _jsx(ExpandMoreIcon, {}),
                    children: _jsx(Typography, {
                      variant: 'body2',
                      children: 'Outputs',
                    }),
                  }),
                  _jsx(AccordionDetails, {
                    children: _jsx(Box, {
                      component: 'pre',
                      sx: { fontSize: '0.75rem', overflow: 'auto' },
                      children: JSON.stringify(step.outputs, null, 2),
                    }),
                  }),
                ],
              }),
          ],
        }),
      ],
    });
  };
  if (loading) {
    return _jsxs(Box, {
      sx: { p: 2 },
      children: [
        _jsx(LinearProgress, {}),
        _jsx(Typography, {
          variant: 'body2',
          sx: { mt: 1 },
          children: 'Loading agent timeline...',
        }),
      ],
    });
  }
  if (error) {
    return _jsxs(Alert, {
      severity: 'error',
      sx: { m: 2 },
      children: ['Failed to load agent timeline: ', error],
    });
  }
  const sortedSteps = steps.sort((a, b) => a.ts - b.ts);
  return _jsxs(Box, {
    sx: { p: 2 },
    children: [
      _jsxs(Box, {
        sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 2 },
        children: [
          _jsx(AgentIcon, {}),
          _jsx(Typography, { variant: 'h6', children: 'Agent Timeline' }),
          _jsx(Chip, {
            label: `${steps.length} steps`,
            size: 'small',
            color: 'primary',
          }),
        ],
      }),
      sortedSteps.length === 0 &&
        _jsx(Alert, {
          severity: 'info',
          children:
            'No agent steps yet. The agent timeline will populate as the run progresses.',
        }),
      _jsx(Timeline, {
        children: sortedSteps.map((step, index) =>
          _jsxs(
            TimelineItem,
            {
              children: [
                _jsxs(TimelineOppositeContent, {
                  color: 'textSecondary',
                  sx: { flex: '0 1 auto' },
                  children: [
                    _jsxs(Box, {
                      sx: { display: 'flex', alignItems: 'center', gap: 1 },
                      children: [
                        _jsx(TimeIcon, { fontSize: 'small' }),
                        _jsx(Typography, {
                          variant: 'caption',
                          children: new Date(step.ts).toLocaleTimeString(),
                        }),
                      ],
                    }),
                    step.metadata?.duration &&
                      _jsx(Typography, {
                        variant: 'caption',
                        color: 'textSecondary',
                        children: formatDuration(step.metadata.duration),
                      }),
                  ],
                }),
                _jsxs(TimelineSeparator, {
                  children: [
                    _jsx(TimelineDot, {
                      color: getStateColor(step.state),
                      children: getRoleIcon(step.role),
                    }),
                    index < sortedSteps.length - 1 &&
                      _jsx(TimelineConnector, {}),
                  ],
                }),
                _jsx(TimelineContent, {
                  children: _jsx(Card, {
                    children: _jsxs(CardContent, {
                      children: [
                        _jsxs(Box, {
                          sx: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          },
                          children: [
                            _jsxs(Box, {
                              sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              },
                              children: [
                                _jsx(Typography, {
                                  variant: 'subtitle1',
                                  sx: { textTransform: 'capitalize' },
                                  children: step.role,
                                }),
                                step.metadata?.checkpoint_type &&
                                  _jsx(Chip, {
                                    label: step.metadata.checkpoint_type,
                                    size: 'small',
                                    color: 'info',
                                  }),
                              ],
                            }),
                            _jsx(Tooltip, {
                              title: step.state,
                              children: _jsx(Chip, {
                                icon: getStateIcon(step.state),
                                label: step.state.replace('_', ' '),
                                color: getStateColor(step.state),
                                size: 'small',
                              }),
                            }),
                          ],
                        }),
                        _jsx(Typography, {
                          variant: 'body2',
                          component: 'pre',
                          sx: {
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit',
                            mb: 1,
                          },
                          children: step.text,
                        }),
                        step.error &&
                          _jsx(Alert, {
                            severity: 'error',
                            sx: { mb: 1 },
                            children: _jsx(Typography, {
                              variant: 'body2',
                              children: step.error,
                            }),
                          }),
                        renderStepActions(step),
                        renderStepMetadata(step),
                      ],
                    }),
                  }),
                }),
              ],
            },
            step.id,
          ),
        ),
      }),
      _jsx(EditDialog, {
        open: editDialogOpen,
        step: selectedStep,
        onClose: () => setEditDialogOpen(false),
        onSave: handleSaveEdit,
      }),
    ],
  });
}
