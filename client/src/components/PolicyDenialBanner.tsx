/**
 * Policy Denial Banner Component - GA Core Implementation
 * Displays policy denial with structured appeal path and reasons
 */

import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import {
  AccessTime,
  Description,
  InfoOutlined,
  Shield,
  WarningAmber,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@apollo/client';
import { SUBMIT_POLICY_APPEAL, GET_APPEAL_STATUS } from '../graphql/appeals';

interface AppealPath {
  available: boolean;
  appealId?: string;
  requiredRole: string;
  slaHours: number;
  escalationHours: number;
  instructions: string;
  submitUrl: string;
  statusUrl?: string;
}

interface PolicyDecision {
  allowed: boolean;
  policy: string;
  reason: string;
  appeal?: AppealPath;
  decisionId: string;
  timestamp: string;
  metadata?: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresJustification?: boolean;
    alternatives?: string[];
  };
}

interface PolicyDenialBannerProps {
  decision: PolicyDecision;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const getRiskLevelColor = (level?: string): ChipProps['color'] => {
  switch (level) {
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'info';
    default:
      return 'default';
  }
};

const getUrgencyColor = (urgency: string): ChipProps['color'] => {
  switch (urgency) {
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

const formatSlaTime = (hours: number) => {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} day${days !== 1 ? 's' : ''}${
    remainingHours > 0
      ? ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
      : ''
  }`;
};

const PolicyDenialBanner: React.FC<PolicyDenialBannerProps> = ({
  decision,
  onRetry,
  onDismiss,
  className,
}) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Appeal form state
  const [justification, setJustification] = useState('');
  const [businessNeed, setBusinessNeed] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>(
    'MEDIUM',
  );
  const [requestedDuration, setRequestedDuration] = useState('24 hours');

  const [submitAppeal] = useMutation(SUBMIT_POLICY_APPEAL);

  // Check if there's an existing appeal
  const { data: appealStatus } = useQuery(GET_APPEAL_STATUS, {
    variables: { decisionId: decision.decisionId },
    skip: !appealSubmitted,
    pollInterval: appealSubmitted ? 30000 : 0,
  });

  const handleSubmitAppeal = async () => {
    try {
      setError(null);
      const result = await submitAppeal({
        variables: {
          decisionId: decision.decisionId,
          justification,
          businessNeed,
          urgency,
          requestedDuration,
        },
      });

      if (result.data?.submitPolicyAppeal) {
        setAppealSubmitted(true);
        setShowAppealForm(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit appeal. Please try again.',
      );
    }
  };

  if (appealStatus?.getAppealStatus?.status === 'APPROVED') {
    return (
      <Alert
        severity="success"
        icon={<Shield fontSize="small" />}
        className={`policy-denial-banner ${className || ''}`}
        action={
          onRetry ? (
            <Button color="success" size="small" onClick={onRetry}>
              Retry Action
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>Appeal Approved</AlertTitle>
        <Typography variant="body2">
          Your access request has been approved by a Data Steward. You may now
          retry your action.
        </Typography>
        {appealStatus.getAppealStatus.responseReason && (
          <Typography variant="caption" color="text.secondary">
            Reason: {appealStatus.getAppealStatus.responseReason}
          </Typography>
        )}
      </Alert>
    );
  }

  return (
    <>
      <Alert
        severity="error"
        icon={<WarningAmber fontSize="small" />}
        className={`policy-denial-banner ${className || ''}`}
        onClose={onDismiss}
      >
        <AlertTitle>Access Denied</AlertTitle>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {decision.metadata?.riskLevel && (
              <Chip
                label={`${decision.metadata.riskLevel} Risk`}
                color={getRiskLevelColor(decision.metadata.riskLevel)}
                size="small"
              />
            )}
            <Typography variant="caption" color="text.secondary">
              Policy: {decision.policy}
            </Typography>
          </Stack>

          <Typography variant="body2">{decision.reason}</Typography>

          {decision.metadata?.alternatives &&
            decision.metadata.alternatives.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Suggested alternatives:
                </Typography>
                <Box component="ul" sx={{ mb: 0, mt: 0.5, pl: 2 }}>
                  {decision.metadata.alternatives.map((alt, index) => (
                    <li key={index}>
                      <Typography variant="body2">{alt}</Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            )}

          {decision.appeal?.available ? (
            <Card
              variant="outlined"
              sx={{ borderColor: 'info.light', bgcolor: 'info.50' }}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoOutlined color="info" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" color="info.main">
                        Appeal Available
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Response SLA: {formatSlaTime(decision.appeal.slaHours)}
                        {decision.appeal.requiredRole && (
                          <span> • Reviewer: {decision.appeal.requiredRole}</span>
                        )}
                      </Typography>
                    </Box>
                  </Stack>

                  {appealSubmitted ? (
                    <Stack spacing={0.5} alignItems="flex-end">
                      {appealStatus?.getAppealStatus ? (
                        <>
                          <Chip
                            label={appealStatus.getAppealStatus.status}
                            color={getUrgencyColor(
                              appealStatus.getAppealStatus.urgency,
                            )}
                            size="small"
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            <AccessTime fontSize="inherit" /> Submitted{' '}
                            {new Date(
                              appealStatus.getAppealStatus.createdAt,
                            ).toLocaleString()}
                          </Typography>
                        </>
                      ) : (
                        <Chip label="Appeal Submitted" color="info" size="small" />
                      )}
                    </Stack>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setShowAppealForm(true)}
                      startIcon={<Description fontSize="small" />}
                    >
                      Submit Appeal
                    </Button>
                  )}
                </Stack>

                {decision.appeal.instructions && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Appeal instructions: {decision.appeal.instructions}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ) : (
            decision.appeal && (
              <Typography variant="caption" color="text.secondary">
                <InfoOutlined fontSize="inherit" />{' '}
                {decision.appeal.instructions ||
                  'This policy decision cannot be appealed.'}
              </Typography>
            )
          )}

          <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <details>
              <summary style={{ cursor: 'pointer' }}>
                <Typography variant="caption" color="text.secondary">
                  Technical Details
                </Typography>
              </summary>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Decision ID: <code>{decision.decisionId}</code>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Timestamp: {new Date(decision.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Policy: <code>{decision.policy}</code>
                </Typography>
                {decision.appeal?.appealId && (
                  <Typography variant="caption" color="text.secondary">
                    Appeal ID: <code>{decision.appeal.appealId}</code>
                  </Typography>
                )}
              </Box>
            </details>
          </Box>
        </Stack>
      </Alert>

      <Dialog
        open={showAppealForm}
        onClose={() => setShowAppealForm(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Submit Policy Appeal</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 2 }} icon={<InfoOutlined />}>
            <Typography variant="body2">
              <strong>Response SLA:</strong>{' '}
              {decision.appeal && formatSlaTime(decision.appeal.slaHours)}
              <br />
              <strong>Reviewer:</strong>{' '}
              {decision.appeal?.requiredRole || 'Data Steward'}
            </Typography>
          </Alert>

          <Stack spacing={2}>
            <TextField
              label="Business Justification"
              multiline
              minRows={3}
              placeholder="Explain why this access is needed for business purposes..."
              value={businessNeed}
              onChange={(e) => setBusinessNeed(e.target.value)}
              required
              helperText="Describe the specific business requirement that necessitates this access."
            />

            <TextField
              label="Technical Justification"
              multiline
              minRows={3}
              placeholder="Provide technical details about the access needed..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              required
              helperText={decision.appeal?.instructions}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Urgency Level</InputLabel>
                <Select
                  label="Urgency Level"
                  value={urgency}
                  onChange={(e) =>
                    setUrgency(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
                  }
                >
                  <MenuItem value="LOW">Low - Routine work</MenuItem>
                  <MenuItem value="MEDIUM">Medium - Standard business need</MenuItem>
                  <MenuItem value="HIGH">High - Time-sensitive requirement</MenuItem>
                  <MenuItem value="CRITICAL">
                    Critical - Security incident or emergency
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Requested Duration</InputLabel>
                <Select
                  label="Requested Duration"
                  value={requestedDuration}
                  onChange={(e) => setRequestedDuration(e.target.value)}
                >
                  <MenuItem value="4 hours">4 hours</MenuItem>
                  <MenuItem value="12 hours">12 hours</MenuItem>
                  <MenuItem value="24 hours">24 hours (default)</MenuItem>
                  <MenuItem value="3 days">3 days</MenuItem>
                  <MenuItem value="1 week">1 week</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Alert severity="warning" icon={<WarningAmber fontSize="small" />}>
              <Typography variant="body2">
                <strong>Note:</strong> All appeals are logged and audited. Misuse
                of the appeal process may result in access restrictions.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAppealForm(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitAppeal}
            disabled={!businessNeed.trim() || !justification.trim()}
          >
            Submit Appeal
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PolicyDenialBanner;
