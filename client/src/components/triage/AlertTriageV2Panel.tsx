import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Rating,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Flag,
  Close,
  ExpandMore,
  Security,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const RECORD_FEEDBACK_MUTATION = gql`
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

const GET_ALERT_FEEDBACK_QUERY = gql`
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

const TRIAGE_SCORING_QUERY = gql`
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

interface AlertTriageV2PanelProps {
  alertId: string;
  alertData: any;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}

const FEEDBACK_TYPES = [
  {
    value: 'thumbs_up',
    label: 'Accurate',
    icon: <ThumbUp />,
    color: 'success',
  },
  {
    value: 'thumbs_down',
    label: 'Inaccurate',
    icon: <ThumbDown />,
    color: 'error',
  },
  { value: 'escalate', label: 'Escalate', icon: <Flag />, color: 'warning' },
  { value: 'dismiss', label: 'Dismiss', icon: <Close />, color: 'default' },
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

export default function AlertTriageV2Panel({
  alertId,
  alertData,
  open,
  onClose,
  onAction,
}: AlertTriageV2PanelProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedFeedbackType, setSelectedFeedbackType] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState(3);

  const { data: feedbackData, refetch: refetchFeedback } = useQuery(
    GET_ALERT_FEEDBACK_QUERY,
    {
      variables: { alertId },
      skip: !alertId,
    },
  );

  const { data: scoringData } = useQuery(TRIAGE_SCORING_QUERY, {
    variables: { alertId },
    skip: !alertId,
  });

  const [recordFeedback, { loading: feedbackLoading }] = useMutation(
    RECORD_FEEDBACK_MUTATION,
    {
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
    },
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      if (action === 'feedback') {
        setFeedbackDialogOpen(true);
      } else {
        onAction(action, { alertId });
      }
    },
    [alertId, onAction],
  );

  const handleFeedbackSubmit = async () => {
    if (!selectedFeedbackType || !reasonCode) return;

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
    if (!scoringData?.triageScoring) return null;

    const { score, confidence, reasoning, factors } = scoringData.triageScoring;
    const scoreColor =
      score >= 0.8 ? 'error' : score >= 0.6 ? 'warning' : 'success';

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Assessment sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Triage Scoring</Typography>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <Typography
              variant="h4"
              color={`${scoreColor}.main`}
              sx={{ mr: 2 }}
            >
              {(score * 100).toFixed(0)}%
            </Typography>
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary">
                Risk Score (Confidence: {(confidence * 100).toFixed(0)}%)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={score * 100}
                color={scoreColor}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {reasoning}
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Scoring Factors</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {factors.map((factor: any, index: number) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography variant="body2">{factor.name}</Typography>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mr: 1 }}
                      >
                        {(factor.contribution * 100).toFixed(1)}%
                      </Typography>
                      <Chip
                        size="small"
                        label={factor.value}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
          Quick Actions
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleQuickAction('contain')}
            startIcon={<Security />}
          >
            Contain
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleQuickAction('escalate')}
            startIcon={<Flag />}
          >
            Escalate
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleQuickAction('dismiss')}
            startIcon={<Close />}
          >
            Dismiss
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleQuickAction('investigate')}
            startIcon={<Assessment />}
          >
            Investigate
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => handleQuickAction('feedback')}
            startIcon={<Timeline />}
          >
            Provide Feedback
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderEvidenceSnippets = () => {
    if (!alertData?.evidenceSnippets) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Evidence Summary
          </Typography>

          {alertData.evidenceSnippets.map((snippet: any, index: number) => (
            <Box
              key={index}
              sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}
            >
              <Typography variant="body2" gutterBottom>
                {snippet.summary}
              </Typography>
              {snippet.sourceLinks && (
                <Box mt={1}>
                  {snippet.sourceLinks.map((link: any, linkIndex: number) => (
                    <Button
                      key={linkIndex}
                      size="small"
                      variant="text"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.title}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderFeedbackHistory = () => {
    if (!feedbackData?.alertFeedback?.length) return null;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Feedback History
          </Typography>

          {feedbackData.alertFeedback.map((feedback: any) => (
            <Box
              key={feedback.id}
              sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}
            >
              <Box display="flex" alignItems="center" mb={1}>
                <Chip
                  size="small"
                  label={
                    FEEDBACK_TYPES.find(
                      (ft) => ft.value === feedback.feedbackType,
                    )?.label
                  }
                  color={
                    FEEDBACK_TYPES.find(
                      (ft) => ft.value === feedback.feedbackType,
                    )?.color
                  }
                  icon={
                    FEEDBACK_TYPES.find(
                      (ft) => ft.value === feedback.feedbackType,
                    )?.icon
                  }
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 2 }}
                >
                  by {feedback.analyst.name} •{' '}
                  {new Date(feedback.createdAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 1 }}>
                Reason: {feedback.reasonCode}
              </Typography>

              {feedback.rationale && (
                <Typography variant="body2" color="text.secondary">
                  {feedback.rationale}
                </Typography>
              )}

              <Box display="flex" alignItems="center" mt={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  Confidence:
                </Typography>
                <Rating value={feedback.confidence * 5} size="small" readOnly />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (!open) return null;

  return (
    <>
      <Box
        sx={{
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
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
          <Typography variant="h5">Alert Triage v2</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        {alertData && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Alert: {alertData.title || alertData.id}
          </Alert>
        )}

        {renderTriageScore()}
        {renderQuickActions()}
        {renderEvidenceSnippets()}
        {renderFeedbackHistory()}
      </Box>

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialogOpen}
        onClose={() => setFeedbackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Provide Feedback</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={selectedFeedbackType}
              onChange={(e) => setSelectedFeedbackType(e.target.value)}
              label="Feedback Type"
            >
              {FEEDBACK_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box display="flex" alignItems="center">
                    {type.icon}
                    <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Reason Code</InputLabel>
            <Select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              label="Reason Code"
            >
              {REASON_CODES.map((code) => (
                <MenuItem key={code} value={code}>
                  {code.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Comments (Optional)"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            sx={{ mb: 2 }}
            helperText="PII will be automatically redacted"
          />

          <Box sx={{ mb: 2 }}>
            <Typography component="legend">Confidence Level</Typography>
            <Rating
              value={confidence}
              onChange={(event, newValue) => setConfidence(newValue || 3)}
              max={5}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleFeedbackSubmit}
            variant="contained"
            disabled={!selectedFeedbackType || !reasonCode || feedbackLoading}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
