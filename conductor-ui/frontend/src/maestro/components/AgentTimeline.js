"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentTimeline;
const react_1 = __importStar(require("react"));
const lab_1 = require("@mui/lab");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../api");
const EditDialog = ({ open, step, onClose, onSave, }) => {
    const [editedText, setEditedText] = (0, react_1.useState)('');
    const [reason, setReason] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
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
    return (<material_1.Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <material_1.DialogTitle>Edit Agent Step</material_1.DialogTitle>
      <material_1.DialogContent>
        <material_1.Box sx={{ mb: 2 }}>
          <material_1.Typography variant="subtitle2" gutterBottom>
            Original Text:
          </material_1.Typography>
          <material_1.Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <material_1.Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {step?.text}
            </material_1.Typography>
          </material_1.Box>
        </material_1.Box>

        <material_1.TextField fullWidth multiline rows={6} label="Edited Text" value={editedText} onChange={(e) => setEditedText(e.target.value)} sx={{ mb: 2 }}/>

        <material_1.TextField fullWidth label="Reason for Edit (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why you're making this change..."/>
      </material_1.DialogContent>
      <material_1.DialogActions>
        <material_1.Button onClick={onClose}>Cancel</material_1.Button>
        <material_1.Button variant="contained" onClick={handleSave} disabled={!editedText.trim()}>
          Save & Approve
        </material_1.Button>
      </material_1.DialogActions>
    </material_1.Dialog>);
};
function AgentTimeline({ runId }) {
    const { getAgentSteps, streamAgent, actOnAgent } = (0, api_1.api)();
    const [steps, setSteps] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [editDialogOpen, setEditDialogOpen] = (0, react_1.useState)(false);
    const [selectedStep, setSelectedStep] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                setLoading(true);
                const r = await getAgentSteps(runId);
                setSteps(r.steps || []);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load agent steps');
            }
            finally {
                setLoading(false);
            }
            const off = streamAgent(runId, (s) => setSteps((x) => {
                const nx = x.filter((y) => y.id !== s.id);
                return [...nx, s].sort((a, b) => a.ts - b.ts);
            }));
            return () => off();
        })();
    }, [runId, getAgentSteps, streamAgent]);
    const handleAction = async (stepId, action, editedText, reason) => {
        try {
            await actOnAgent(runId, {
                stepId,
                action,
                patch: editedText,
                reason,
            });
            // Update local state optimistically
            setSteps((prevSteps) => prevSteps.map((step) => step.id === stepId
                ? {
                    ...step,
                    state: action === 'approve' ? 'approved' : 'blocked',
                    text: editedText || step.text,
                    metadata: {
                        ...step.metadata,
                        user_action: action,
                        edit_history: editedText && editedText !== step.text
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
                : step));
        }
        catch (err) {
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
                return <icons_material_1.PersonOutlined />;
            case 'critic':
                return <icons_material_1.PsychologyOutlined />;
            case 'executor':
                return <icons_material_1.BuildOutlined />;
            case 'human':
                return <icons_material_1.PersonOutlined />;
            default:
                return <icons_material_1.SmartToyOutlined />;
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
                return <icons_material_1.CheckCircleOutlined color="success"/>;
            case 'blocked':
                return <icons_material_1.BlockOutlined color="error"/>;
            case 'need_approval':
                return <icons_material_1.PendingOutlined color="warning"/>;
            case 'running':
                return <icons_material_1.PlayArrowOutlined color="primary"/>;
            default:
                return <icons_material_1.PendingOutlined />;
        }
    };
    const formatDuration = (ms) => {
        if (!ms)
            return '';
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };
    const renderStepActions = (step) => {
        if (step.state !== 'need_approval')
            return null;
        return (<material_1.Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <material_1.Button variant="contained" color="success" size="small" startIcon={<icons_material_1.CheckCircleOutlined />} onClick={() => handleAction(step.id, 'approve')}>
          Approve
        </material_1.Button>

        <material_1.Button variant="contained" color="error" size="small" startIcon={<icons_material_1.BlockOutlined />} onClick={() => handleAction(step.id, 'block')}>
          Block
        </material_1.Button>

        <material_1.Button variant="outlined" size="small" startIcon={<icons_material_1.EditOutlined />} onClick={() => handleEdit(step)}>
          Edit & Approve
        </material_1.Button>
      </material_1.Box>);
    };
    const renderStepMetadata = (step) => {
        if (!step.metadata)
            return null;
        const { duration, cost, confidence, tools_used, edit_history } = step.metadata;
        return (<material_1.Accordion sx={{ mt: 1 }}>
        <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
          <material_1.Typography variant="body2" color="textSecondary">
            Step Details
          </material_1.Typography>
        </material_1.AccordionSummary>
        <material_1.AccordionDetails>
          <material_1.Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                mb: 2,
            }}>
            {duration && (<material_1.Box>
                <material_1.Typography variant="caption" color="textSecondary">
                  Duration
                </material_1.Typography>
                <material_1.Typography variant="body2">
                  {formatDuration(duration)}
                </material_1.Typography>
              </material_1.Box>)}

            {cost && (<material_1.Box>
                <material_1.Typography variant="caption" color="textSecondary">
                  Cost
                </material_1.Typography>
                <material_1.Typography variant="body2">${cost.toFixed(4)}</material_1.Typography>
              </material_1.Box>)}

            {confidence && (<material_1.Box>
                <material_1.Typography variant="caption" color="textSecondary">
                  Confidence
                </material_1.Typography>
                <material_1.Typography variant="body2">
                  {(confidence * 100).toFixed(1)}%
                </material_1.Typography>
              </material_1.Box>)}
          </material_1.Box>

          {tools_used && tools_used.length > 0 && (<material_1.Box sx={{ mb: 2 }}>
              <material_1.Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                Tools Used
              </material_1.Typography>
              <material_1.Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {tools_used.map((tool, index) => (<material_1.Chip key={index} label={tool} size="small" variant="outlined"/>))}
              </material_1.Box>
            </material_1.Box>)}

          {edit_history && edit_history.length > 0 && (<material_1.Box>
              <material_1.Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                Edit History
              </material_1.Typography>
              <material_1.List dense>
                {edit_history.map((edit, index) => (<material_1.ListItem key={index}>
                    <material_1.ListItemText primary={`Edit ${index + 1}`} secondary={`${new Date(edit.timestamp).toLocaleString()}${edit.reason ? ` - ${edit.reason}` : ''}`}/>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.Box>)}

          {step.inputs && (<material_1.Accordion>
              <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                <material_1.Typography variant="body2">Inputs</material_1.Typography>
              </material_1.AccordionSummary>
              <material_1.AccordionDetails>
                <material_1.Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                  {JSON.stringify(step.inputs, null, 2)}
                </material_1.Box>
              </material_1.AccordionDetails>
            </material_1.Accordion>)}

          {step.outputs && (<material_1.Accordion>
              <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
                <material_1.Typography variant="body2">Outputs</material_1.Typography>
              </material_1.AccordionSummary>
              <material_1.AccordionDetails>
                <material_1.Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                  {JSON.stringify(step.outputs, null, 2)}
                </material_1.Box>
              </material_1.AccordionDetails>
            </material_1.Accordion>)}
        </material_1.AccordionDetails>
      </material_1.Accordion>);
    };
    if (loading) {
        return (<material_1.Box sx={{ p: 2 }}>
        <material_1.LinearProgress />
        <material_1.Typography variant="body2" sx={{ mt: 1 }}>
          Loading agent timeline...
        </material_1.Typography>
      </material_1.Box>);
    }
    if (error) {
        return (<material_1.Alert severity="error" sx={{ m: 2 }}>
        Failed to load agent timeline: {error}
      </material_1.Alert>);
    }
    const sortedSteps = steps.sort((a, b) => a.ts - b.ts);
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <icons_material_1.SmartToyOutlined />
        <material_1.Typography variant="h6">Agent Timeline</material_1.Typography>
        <material_1.Chip label={`${steps.length} steps`} size="small" color="primary"/>
      </material_1.Box>

      {sortedSteps.length === 0 && (<material_1.Alert severity="info">
          No agent steps yet. The agent timeline will populate as the run
          progresses.
        </material_1.Alert>)}

      <lab_1.Timeline>
        {sortedSteps.map((step, index) => (<lab_1.TimelineItem key={step.id}>
            <lab_1.TimelineOppositeContent color="textSecondary" sx={{ flex: '0 1 auto' }}>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <icons_material_1.AccessTimeOutlined fontSize="small"/>
                <material_1.Typography variant="caption">
                  {new Date(step.ts).toLocaleTimeString()}
                </material_1.Typography>
              </material_1.Box>
              {step.metadata?.duration && (<material_1.Typography variant="caption" color="textSecondary">
                  {formatDuration(step.metadata.duration)}
                </material_1.Typography>)}
            </lab_1.TimelineOppositeContent>

            <lab_1.TimelineSeparator>
              <lab_1.TimelineDot color={getStateColor(step.state)}>
                {getRoleIcon(step.role)}
              </lab_1.TimelineDot>
              {index < sortedSteps.length - 1 && <lab_1.TimelineConnector />}
            </lab_1.TimelineSeparator>

            <lab_1.TimelineContent>
              <material_1.Card>
                <material_1.CardContent>
                  <material_1.Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
            }}>
                    <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <material_1.Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                        {step.role}
                      </material_1.Typography>
                      {step.metadata?.checkpoint_type && (<material_1.Chip label={step.metadata.checkpoint_type} size="small" color="info"/>)}
                    </material_1.Box>

                    <material_1.Tooltip title={step.state}>
                      <material_1.Chip icon={getStateIcon(step.state)} label={step.state.replace('_', ' ')} color={getStateColor(step.state)} size="small"/>
                    </material_1.Tooltip>
                  </material_1.Box>

                  <material_1.Typography variant="body2" component="pre" sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                mb: 1,
            }}>
                    {step.text}
                  </material_1.Typography>

                  {step.error && (<material_1.Alert severity="error" sx={{ mb: 1 }}>
                      <material_1.Typography variant="body2">{step.error}</material_1.Typography>
                    </material_1.Alert>)}

                  {renderStepActions(step)}
                  {renderStepMetadata(step)}
                </material_1.CardContent>
              </material_1.Card>
            </lab_1.TimelineContent>
          </lab_1.TimelineItem>))}
      </lab_1.Timeline>

      <EditDialog open={editDialogOpen} step={selectedStep} onClose={() => setEditDialogOpen(false)} onSave={handleSaveEdit}/>
    </material_1.Box>);
}
