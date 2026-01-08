import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = Grid as any;

import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";

export interface ApprovalQueueItem {
  id: string;
  requester: string;
  operation: string;
  submittedAt: string;
  obligations: string[];
  riskFlags: string[];
}

type Fetcher = typeof fetch;

const normalizeApprovals = (payload: unknown): ApprovalQueueItem[] => {
  const approvals = Array.isArray(payload)
    ? payload
    : (payload as { approvals?: unknown })?.approvals;

  if (!Array.isArray(approvals)) {
    return [];
  }

  return approvals.map((item, index) => {
    const record = item as Record<string, unknown>;
    const id = String(record.id ?? `approval-${index}`);
    const requester =
      (record.requester as string) || (record.requester_id as string) || "unknown-requester";
    const operation = (record.operation as string) || (record.action as string) || "Pending action";
    const submittedAt =
      (record.submittedAt as string) || (record.created_at as string) || new Date().toISOString();
    const obligations = Array.isArray(record.obligations) ? (record.obligations as string[]) : [];
    const riskFlags = Array.isArray(record.riskFlags)
      ? (record.riskFlags as string[])
      : Array.isArray(record.risks)
        ? (record.risks as string[])
        : [];

    return {
      id,
      requester,
      operation,
      submittedAt,
      obligations,
      riskFlags,
    };
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export function useApprovalsQueue(fetchImpl: Fetcher = fetch) {
  const [approvals, setApprovals] = React.useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const loadQueue = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchImpl("/api/switchboard/approvals");
      if (!response.ok) {
        throw new Error("Failed to load approvals");
      }
      const payload = await response.json();
      setApprovals(normalizeApprovals(payload));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load approvals";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchImpl]);

  React.useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const updateApproval = React.useCallback(
    async (id: string, action: "approve" | "deny", rationale: string) => {
      const snapshot = approvals.map((item) => ({ ...item }));
      setPendingId(id);
      setError(null);
      setApprovals((prev) => prev.filter((item) => item.id !== id));

      try {
        const response = await fetchImpl(`/api/switchboard/approvals/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rationale }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Decision failed");
        }

        await loadQueue();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Decision failed";
        setApprovals(snapshot);
        setError(message);
      } finally {
        setPendingId(null);
      }
    },
    [approvals, fetchImpl, loadQueue]
  );

  return {
    approvals,
    loading,
    error,
    refresh: loadQueue,
    approve: (id: string, rationale: string) => updateApproval(id, "approve", rationale),
    deny: (id: string, rationale: string) => updateApproval(id, "deny", rationale),
    pendingId,
  };
}

export default function ApprovalsList() {
  const { approvals, loading, error, refresh, approve, deny, pendingId } = useApprovalsQueue();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [rationaleById, setRationaleById] = React.useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = React.useState(false);

  React.useEffect(() => {
    if (!selectedId && approvals.length > 0) {
      setSelectedId(approvals[0].id);
    } else if (selectedId && approvals.every((item) => item.id !== selectedId)) {
      setSelectedId(approvals[0]?.id ?? null);
    }
  }, [approvals, selectedId]);

  const selected = React.useMemo(
    () => approvals.find((item) => item.id === selectedId) ?? null,
    [approvals, selectedId]
  );

  const rationale = selected?.id ? rationaleById[selected.id] || "" : "";
  const rationaleError =
    showValidation && !rationale.trim() ? "Rationale is required to record your decision." : "";

  const handleRationaleChange = (value: string) => {
    if (!selected?.id) return;
    setRationaleById((prev) => ({ ...prev, [selected.id]: value }));
  };

  const handleDecision = async (action: "approve" | "deny") => {
    if (!selected?.id) return;
    if (!rationale.trim()) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);

    if (action === "approve") {
      await approve(selected.id, rationale.trim());
    } else {
      await deny(selected.id, rationale.trim());
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberIcon color="primary" />
          <Box>
            <Typography variant="h6">Approval queue</Typography>
            <Typography variant="body2" color="text.secondary">
              High-risk automation steps are paused until an operator records a decision.
            </Typography>
          </Box>
        </Stack>
        <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading} variant="outlined">
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading approvals…</Typography>
        </Stack>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!loading && approvals.length === 0 ? (
        <Alert severity="info" sx={{ mb: 0 }}>
          No pending approvals. You are all caught up.
        </Alert>
      ) : (
        <AnyGrid container spacing={2} alignItems="stretch">
          <AnyGrid xs={12} md={5} lg={4}>
            <Paper variant="outlined" sx={{ height: "100%" }}>
              <List disablePadding>
                {approvals.map((item) => (
                  <React.Fragment key={item.id}>
                    <ListItemButton
                      selected={item.id === selected?.id}
                      alignItems="flex-start"
                      onClick={() => setSelectedId(item.id)}
                      data-testid={`approval-row-${item.id}`}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" component="div">
                            {item.operation}
                          </Typography>
                        }
                        secondary={
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Requested by {item.requester}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Submitted {new Date(item.submittedAt).toLocaleString()}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {item.riskFlags.map((risk) => (
                                <Chip
                                  key={`${item.id}-risk-${risk}`}
                                  label={risk}
                                  size="small"
                                  color="error"
                                  icon={<WarningAmberIcon fontSize="small" />}
                                />
                              ))}
                              {item.obligations.map((obligation) => (
                                <Chip
                                  key={`${item.id}-obligation-${obligation}`}
                                  label={obligation}
                                  size="small"
                                  color="info"
                                  icon={<ShieldIcon fontSize="small" />}
                                />
                              ))}
                            </Stack>
                          </Stack>
                        }
                      />
                    </ListItemButton>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </AnyGrid>

          <AnyGrid xs={12} md={7} lg={8}>
            <Paper variant="outlined" sx={{ height: "100%", p: 2 }}>
              {selected ? (
                <Stack spacing={2} height="100%">
                  <Box>
                    <Typography variant="h6">{selected.operation}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selected.requester} • Submitted{" "}
                      {new Date(selected.submittedAt).toLocaleString()}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selected.riskFlags.length ? (
                      selected.riskFlags.map((flag) => (
                        <Chip
                          key={`${selected.id}-risk-${flag}`}
                          icon={<WarningAmberIcon fontSize="small" />}
                          label={flag}
                          color="error"
                          size="small"
                        />
                      ))
                    ) : (
                      <Chip label="No risk flags" size="small" color="success" />
                    )}

                    {selected.obligations.length ? (
                      selected.obligations.map((obligation) => (
                        <Chip
                          key={`${selected.id}-obligation-${obligation}`}
                          icon={<ShieldIcon fontSize="small" />}
                          label={obligation}
                          color="info"
                          size="small"
                        />
                      ))
                    ) : (
                      <Chip label="No obligations recorded" size="small" variant="outlined" />
                    )}
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Rationale & audit trail
                    </Typography>
                    <TextField
                      label="Rationale"
                      multiline
                      minRows={3}
                      fullWidth
                      value={rationale}
                      onChange={(event) => handleRationaleChange(event.target.value)}
                      onBlur={() => setShowValidation(true)}
                      error={Boolean(rationaleError)}
                      helperText={
                        rationaleError || "Capture why you are approving or denying this run."
                      }
                    />
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleDecision("approve")}
                      disabled={Boolean(pendingId)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => handleDecision("deny")}
                      disabled={Boolean(pendingId)}
                    >
                      Deny
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <Typography variant="subtitle1">
                    Select a request to review the details.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Obligations, risk flags, and rationale capture will appear here.
                  </Typography>
                </Stack>
              )}
            </Paper>
          </AnyGrid>
        </AnyGrid>
      )}
    </Paper>
  );
}
