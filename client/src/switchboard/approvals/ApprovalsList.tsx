import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalQueueItem {
  id: string;
  requester_id: string;
  approver_id?: string | null;
  status: ApprovalStatus;
  action?: string | null;
  payload?: Record<string, unknown> | null;
  reason?: string | null;
  decision_reason?: string | null;
  run_id?: string | null;
  created_at: string;
}

type Decision = 'approve' | 'reject';

const statusColor: Record<ApprovalStatus, 'info' | 'success' | 'error'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'error',
};

export function useApprovalsQueue(status: ApprovalStatus = 'pending') {
  const [approvals, setApprovals] = React.useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals?status=${status}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load approvals');
      }
      const data = await response.json();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err) {
      setApprovals([]);
      setError((err as Error)?.message || 'Unable to load approvals');
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const submitDecision = React.useCallback(
    async (id: string, decision: Decision, rationale?: string) => {
      let previousState: ApprovalQueueItem[] = [];
      setError(null);

      setApprovals((current) => {
        previousState = current;
        if (status === 'pending') {
          return current.filter((item) => item.id !== id);
        }
        return current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision === 'approve' ? 'approved' : 'rejected',
                decision_reason: rationale || '',
              }
            : item,
        );
      });

      try {
        const response = await fetch(
          `/api/approvals/${id}/${decision === 'approve' ? 'approve' : 'reject'}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rationale || '' }),
          },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Unable to submit decision');
        }

        const body = await response.json();
        if (body?.approval) {
          setApprovals((current) => {
            if (status === 'pending') {
              return current;
            }
            const exists = current.some((item) => item.id === id);
            if (exists) {
              return current.map((item) =>
                item.id === id ? { ...item, ...body.approval } : item,
              );
            }
            return [...current, body.approval];
          });
        }

        await refresh();
      } catch (err) {
        setError((err as Error)?.message || 'Unable to submit decision');
        setApprovals(previousState);
      }
    },
    [refresh, status],
  );

  return { approvals, loading, error, refresh, submitDecision };
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export default function ApprovalsList() {
  const { approvals, loading, error, refresh, submitDecision } = useApprovalsQueue();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [rationale, setRationale] = React.useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!approvals.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !approvals.some((item) => item.id === selectedId)) {
      setSelectedId(approvals[0].id);
    }
  }, [approvals, selectedId]);

  const selected = React.useMemo(
    () => approvals.find((item) => item.id === selectedId) || approvals[0] || null,
    [approvals, selectedId],
  );

  const obligations = React.useMemo(() => {
    const payload = (selected?.payload as { obligations?: string[] }) || {};
    return payload.obligations || [];
  }, [selected]);

  const riskFlags = React.useMemo(() => {
    const payload = (selected?.payload as { risk_flags?: string[]; risks?: string[] }) || {};
    return payload.risk_flags || payload.risks || [];
  }, [selected]);

  const handleDecision = async (decision: Decision) => {
    if (!selected) return;
    setSubmittingId(selected.id);
    await submitDecision(selected.id, decision, rationale[selected.id] || '');
    setSubmittingId(null);
  };

  const detailPane = selected ? (
    <Card variant="outlined" sx={{ flex: 1, minHeight: 420 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={selected.status.toUpperCase()}
              color={statusColor[selected.status]}
              size="small"
            />
            {selected.action ? <Chip label={selected.action} size="small" /> : null}
            {selected.run_id ? (
              <Chip label={`Run: ${selected.run_id}`} size="small" variant="outlined" />
            ) : null}
          </Stack>

          <Box>
            <Typography variant="h6">
              {selected.reason || 'Automation requires approval'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requested by <strong>{selected.requester_id}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Created: {formatDate(selected.created_at)}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Obligations
            </Typography>
            {obligations.length ? (
              <Stack spacing={1}>
                {obligations.map((item) => (
                  <Stack
                    key={item}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ color: 'text.secondary' }}
                  >
                    <SecurityIcon fontSize="small" />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No additional obligations were attached to this request.
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Risk flags
            </Typography>
            {riskFlags.length ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {riskFlags.map((flag) => (
                  <Chip
                    key={flag}
                    label={flag}
                    icon={<WarningAmberIcon fontSize="small" />}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No risks flagged. Continue to capture rationale before proceeding.
              </Typography>
            )}
          </Box>

          <TextField
            label="Rationale / audit note"
            placeholder="Why is this safe to run?"
            multiline
            minRows={3}
            value={(selected && rationale[selected.id]) || ''}
            onChange={(event) =>
              setRationale((prev) => ({ ...prev, [selected.id]: event.target.value }))
            }
          />

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleDecision('approve')}
              disabled={!!submittingId || loading}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => handleDecision('reject')}
              disabled={!!submittingId || loading}
            >
              Deny
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  ) : (
    <Card variant="outlined" sx={{ flex: 1, minHeight: 420 }}>
      <CardContent sx={{ height: '100%' }}>
        <Stack
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ height: '100%' }}
        >
          <PendingActionsIcon color="disabled" fontSize="large" />
          <Typography variant="body2" color="text.secondary" align="center">
            Select a request to review its obligations, risk flags, and rationale.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <PendingActionsIcon color="primary" />
          <Box>
            <Typography variant="h5">Approvals queue</Typography>
            <Typography variant="body2" color="text.secondary">
              Review blocked automations and document the rationale for your decision.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 2 }}
          role="status"
          aria-label="Loading approvals"
        >
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading approvals…
          </Typography>
        </Stack>
      ) : null}

      {!loading && !approvals.length ? (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ mb: 2 }}>
          No pending approvals in the queue.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ width: { xs: '100%', md: 360 } }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Pending requests
            </Typography>
            <List dense disablePadding>
              {approvals.map((item) => (
                <ListItemButton
                  key={item.id}
                  selected={item.id === selected?.id}
                  onClick={() => setSelectedId(item.id)}
                  divider
                >
              <ListItemText
                primary={item.reason || 'Automation pause requires review'}
                secondaryTypographyProps={{ component: 'div' }}
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                          label={item.status}
                          size="small"
                          color={statusColor[item.status]}
                          variant="outlined"
                        />
                        {item.action ? <Chip label={item.action} size="small" /> : null}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.created_at)}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
        {detailPane}
      </Stack>
    </Box>
  );
}
