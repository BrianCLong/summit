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
exports.default = AlertTriageV2Panel;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const client_1 = require("@apollo/client");
const client_2 = require("@apollo/client");
const RECORD_FEEDBACK_MUTATION = (0, client_2.gql) `
  mutation RecordAnalystFeedback($input: AnalystFeedbackInput!) {
    recordAnalystFeedback(input: $input) {
      id
      feedbackType
      reasonCode
      confidence
      createdAt
    }
  }
`;
const GET_ALERT_FEEDBACK_QUERY = (0, client_2.gql) `
  query GetAlertFeedback($alertId: ID!) {
    alertFeedback(alertId: $alertId) {
      id
      feedbackType
      reasonCode
      rationale
      confidence
      createdAt
      analyst {
        id
        name
      }
    }
    alertLabels(alertId: $alertId) {
      id
      label
      value
      source
      confidence
      createdAt
    }
  }
`;
const TRIAGE_SCORING_QUERY = (0, client_2.gql) `
  query GetTriageScoring($alertId: ID!) {
    triageScoring(alertId: $alertId) {
      score
      confidence
      reasoning
      factors {
        name
        weight
        value
        contribution
      }
      recommendations {
        action
        priority
        rationale
      }
    }
  }
`;
const FEEDBACK_TYPES = [
    {
        value: 'thumbs_up',
        label: 'Accurate',
        icon: <icons_material_1.ThumbUp />,
        color: 'success',
    },
    {
        value: 'thumbs_down',
        label: 'Inaccurate',
        icon: <icons_material_1.ThumbDown />,
        color: 'error',
    },
    { value: 'escalate', label: 'Escalate', icon: <icons_material_1.Flag />, color: 'warning' },
    { value: 'dismiss', label: 'Dismiss', icon: <icons_material_1.Close />, color: 'default' },
];
const REASON_CODES = [
    'false_positive',
    'true_positive',
    'needs_investigation',
    'benign_activity',
    'insufficient_data',
    'duplicate_alert',
    'policy_violation',
    'security_incident',
];
function AlertTriageV2Panel({ alertId, alertData, open, onClose, onAction, }) {
    const [feedbackDialogOpen, setFeedbackDialogOpen] = (0, react_1.useState)(false);
    const [selectedFeedbackType, setSelectedFeedbackType] = (0, react_1.useState)('');
    const [reasonCode, setReasonCode] = (0, react_1.useState)('');
    const [rationale, setRationale] = (0, react_1.useState)('');
    const [confidence, setConfidence] = (0, react_1.useState)(3);
    const { data: feedbackData, refetch: refetchFeedback } = (0, client_1.useQuery)(GET_ALERT_FEEDBACK_QUERY, {
        variables: { alertId },
        skip: !alertId,
    });
    const { data: scoringData } = (0, client_1.useQuery)(TRIAGE_SCORING_QUERY, {
        variables: { alertId },
        skip: !alertId,
    });
    const [recordFeedback, { loading: feedbackLoading }] = (0, client_1.useMutation)(RECORD_FEEDBACK_MUTATION, {
        onCompleted: () => {
            setFeedbackDialogOpen(false);
            refetchFeedback();
            setSelectedFeedbackType('');
            setReasonCode('');
            setRationale('');
            setConfidence(3);
        },
        onError: (error) => {
            console.error('Failed to record feedback:', error);
        },
    });
    const handleQuickAction = (0, react_1.useCallback)((action) => {
        if (action === 'feedback') {
            setFeedbackDialogOpen(true);
        }
        else {
            onAction(action, { alertId });
        }
    }, [alertId, onAction]);
    const handleFeedbackSubmit = async () => {
        if (!selectedFeedbackType || !reasonCode)
            return;
        await recordFeedback({
            variables: {
                input: {
                    alertId,
                    feedbackType: selectedFeedbackType,
                    reasonCode,
                    rationale: rationale || null,
                    confidence: confidence / 5, // Convert to 0-1 scale
                },
            },
        });
    };
    const renderTriageScore = () => {
        if (!scoringData?.triageScoring)
            return null;
        const { score, confidence, reasoning, factors } = scoringData.triageScoring;
        const scoreColor = score >= 0.8 ? 'error' : score >= 0.6 ? 'warning' : 'success';
        return (<material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Box display="flex" alignItems="center" mb={2}>
            <icons_material_1.Assessment sx={{ mr: 1, color: 'primary.main' }}/>
            <material_1.Typography variant="h6">Triage Scoring</material_1.Typography>
          </material_1.Box>

          <material_1.Box display="flex" alignItems="center" mb={2}>
            <material_1.Typography variant="h4" color={`${scoreColor}.main`} sx={{ mr: 2 }}>
              {(score * 100).toFixed(0)}%
            </material_1.Typography>
            <material_1.Box flex={1}>
              <material_1.Typography variant="body2" color="text.secondary">
                Risk Score (Confidence: {(confidence * 100).toFixed(0)}%)
              </material_1.Typography>
              <material_1.LinearProgress variant="determinate" value={score * 100} color={scoreColor} sx={{ mt: 1 }}/>
            </material_1.Box>
          </material_1.Box>

          <material_1.Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {reasoning}
          </material_1.Typography>

          <material_1.Accordion>
            <material_1.AccordionSummary expandIcon={<icons_material_1.ExpandMore />}>
              <material_1.Typography variant="subtitle2">Scoring Factors</material_1.Typography>
            </material_1.AccordionSummary>
            <material_1.AccordionDetails>
              <material_1.Box>
                {factors.map((factor, index) => (<material_1.Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <material_1.Typography variant="body2">{factor.name}</material_1.Typography>
                    <material_1.Box display="flex" alignItems="center">
                      <material_1.Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        {(factor.contribution * 100).toFixed(1)}%
                      </material_1.Typography>
                      <material_1.Chip size="small" label={factor.value} variant="outlined"/>
                    </material_1.Box>
                  </material_1.Box>))}
              </material_1.Box>
            </material_1.AccordionDetails>
          </material_1.Accordion>
        </material_1.CardContent>
      </material_1.Card>);
    };
    const renderQuickActions = () => (<material_1.Card sx={{ mb: 2 }}>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          <icons_material_1.Security sx={{ mr: 1, verticalAlign: 'middle' }}/>
          Quick Actions
        </material_1.Typography>

        <material_1.Box display="flex" flexWrap="wrap" gap={1}>
          <material_1.Button variant="contained" color="primary" onClick={() => handleQuickAction('contain')} startIcon={<icons_material_1.Security />}>
            Contain
          </material_1.Button>
          <material_1.Button variant="contained" color="warning" onClick={() => handleQuickAction('escalate')} startIcon={<icons_material_1.Flag />}>
            Escalate
          </material_1.Button>
          <material_1.Button variant="outlined" onClick={() => handleQuickAction('dismiss')} startIcon={<icons_material_1.Close />}>
            Dismiss
          </material_1.Button>
          <material_1.Button variant="outlined" color="primary" onClick={() => handleQuickAction('investigate')} startIcon={<icons_material_1.Assessment />}>
            Investigate
          </material_1.Button>
          <material_1.Button variant="outlined" color="secondary" onClick={() => handleQuickAction('feedback')} startIcon={<icons_material_1.Timeline />}>
            Provide Feedback
          </material_1.Button>
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
    const renderEvidenceSnippets = () => {
        if (!alertData?.evidenceSnippets)
            return null;
        return (<material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Evidence Summary
          </material_1.Typography>

          {alertData.evidenceSnippets.map((snippet, index) => (<material_1.Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <material_1.Typography variant="body2" gutterBottom>
                {snippet.summary}
              </material_1.Typography>
              {snippet.sourceLinks && (<material_1.Box mt={1}>
                  {snippet.sourceLinks.map((link, linkIndex) => (<material_1.Button key={linkIndex} size="small" variant="text" href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.title}
                    </material_1.Button>))}
                </material_1.Box>)}
            </material_1.Box>))}
        </material_1.CardContent>
      </material_1.Card>);
    };
    const renderFeedbackHistory = () => {
        if (!feedbackData?.alertFeedback?.length)
            return null;
        return (<material_1.Card sx={{ mb: 2 }}>
        <material_1.CardContent>
          <material_1.Typography variant="h6" gutterBottom>
            Feedback History
          </material_1.Typography>

          {feedbackData.alertFeedback.map((feedback) => (<material_1.Box key={feedback.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <material_1.Box display="flex" alignItems="center" mb={1}>
                <material_1.Chip size="small" label={FEEDBACK_TYPES.find((ft) => ft.value === feedback.feedbackType)?.label} color={FEEDBACK_TYPES.find((ft) => ft.value === feedback.feedbackType)?.color ?? 'default'} icon={FEEDBACK_TYPES.find((ft) => ft.value === feedback.feedbackType)?.icon}/>
                <material_1.Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  by {feedback.analyst.name} •{' '}
                  {new Date(feedback.createdAt).toLocaleString()}
                </material_1.Typography>
              </material_1.Box>

              <material_1.Typography variant="body2" sx={{ mb: 1 }}>
                Reason: {feedback.reasonCode}
              </material_1.Typography>

              {feedback.rationale && (<material_1.Typography variant="body2" color="text.secondary">
                  {feedback.rationale}
                </material_1.Typography>)}

              <material_1.Box display="flex" alignItems="center" mt={1}>
                <material_1.Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Confidence:
                </material_1.Typography>
                <material_1.Rating value={feedback.confidence * 5} size="small" readOnly/>
              </material_1.Box>
            </material_1.Box>))}
        </material_1.CardContent>
      </material_1.Card>);
    };
    if (!open)
        return null;
    return (<>
      <material_1.Box sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 400,
            height: '100vh',
            bgcolor: 'background.paper',
            boxShadow: 3,
            zIndex: 1300,
            overflow: 'auto',
            p: 2,
        }}>
        <material_1.Box display="flex" alignItems="center" justifyContent="between" mb={2}>
          <material_1.Typography variant="h5">Alert Triage v2</material_1.Typography>
          <material_1.IconButton onClick={onClose}>
            <icons_material_1.Close />
          </material_1.IconButton>
        </material_1.Box>

        {alertData && (<material_1.Alert severity="info" sx={{ mb: 2 }}>
            Alert: {alertData.title || alertData.id}
          </material_1.Alert>)}

        {renderTriageScore()}
        {renderQuickActions()}
        {renderEvidenceSnippets()}
        {renderFeedbackHistory()}
      </material_1.Box>

      {/* Feedback Dialog */}
      <material_1.Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>Provide Feedback</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <material_1.InputLabel>Feedback Type</material_1.InputLabel>
            <material_1.Select value={selectedFeedbackType} onChange={(e) => setSelectedFeedbackType(e.target.value)} label="Feedback Type">
              {FEEDBACK_TYPES.map((type) => (<material_1.MenuItem key={type.value} value={type.value}>
                  <material_1.Box display="flex" alignItems="center">
                    {type.icon}
                    <material_1.Typography sx={{ ml: 1 }}>{type.label}</material_1.Typography>
                  </material_1.Box>
                </material_1.MenuItem>))}
            </material_1.Select>
          </material_1.FormControl>

          <material_1.FormControl fullWidth sx={{ mb: 2 }}>
            <material_1.InputLabel>Reason Code</material_1.InputLabel>
            <material_1.Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} label="Reason Code">
              {REASON_CODES.map((code) => (<material_1.MenuItem key={code} value={code}>
                  {code.replace('_', ' ').toUpperCase()}
                </material_1.MenuItem>))}
            </material_1.Select>
          </material_1.FormControl>

          <material_1.TextField fullWidth multiline rows={3} label="Additional Comments (Optional)" value={rationale} onChange={(e) => setRationale(e.target.value)} sx={{ mb: 2 }} helperText="PII will be automatically redacted"/>

          <material_1.Box sx={{ mb: 2 }}>
            <material_1.Typography component="legend">Confidence Level</material_1.Typography>
            <material_1.Rating value={confidence} onChange={(event, newValue) => setConfidence(newValue || 3)} max={5}/>
          </material_1.Box>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button onClick={handleFeedbackSubmit} variant="contained" disabled={!selectedFeedbackType || !reasonCode || feedbackLoading}>
            Submit Feedback
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </>);
}
