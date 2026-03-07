import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyGrid = Grid as any;

import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PendingActions as PendingActionsIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface Approval {
  id: string;
  requester_id: string;
  approver_id?: string | null;
  status: string;
  action?: string | null;
  reason?: string | null;
  decision_reason?: string | null;
  run_id?: string | null;
  created_at: string;
}

const statusChipColor: Record<string, "default" | "success" | "error" | "info"> = {
  pending: "info",
  approved: "success",
  rejected: "error",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = React.useState<Approval[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [decisionNotes, setDecisionNotes] = React.useState<Record<string, string>>({});

  const fetchApprovals = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/approvals?status=pending");
      if (!response.ok) {
        throw new Error("Failed to load approvals");
      }
      const data = await response.json();
      setApprovals(Array.isArray(data) ? data : []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const updateDecisionNote = (id: string, value: string) => {
    setDecisionNotes((prev) => ({ ...prev, [id]: value }));
  };

  const decide = async (id: string, action: "approve" | "reject") => {
    try {
      setError("");
      const response = await fetch(`/api/approvals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: decisionNotes[id] || "" }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Decision failed");
      }

      await fetchApprovals();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || "Decision failed");
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PendingActionsIcon color="primary" />
          <Box>
            <Typography variant="h5">Pending Approvals</Typography>
            <Typography variant="body2" color="text.secondary">
              High-risk automations are paused until an operator approves them.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchApprovals}
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

      {approvals.length === 0 && !loading ? (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
          No pending approvals. You are all caught up.
        </Alert>
      ) : null}

      <AnyGrid container spacing={2}>
        {approvals.map((approval) => (
          <AnyGrid xs={12} md={6} key={approval.id}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={approval.status.toUpperCase()}
                      color={statusChipColor[approval.status] || "default"}
                      size="small"
                    />
                    {approval.action ? <Chip label={approval.action} size="small" /> : null}
                    {approval.run_id ? (
                      <Chip label={`Run: ${approval.run_id}`} size="small" />
                    ) : null}
                  </Stack>

                  <Typography variant="subtitle1">
                    Requested by <strong>{approval.requester_id}</strong>
                  </Typography>
                  {approval.reason ? (
                    <Typography variant="body2" color="text.secondary">
                      Reason: {approval.reason}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(approval.created_at).toLocaleString()}
                  </Typography>

                  <TextField
                    label="Decision reason"
                    value={decisionNotes[approval.id] || ""}
                    onChange={(e) => updateDecisionNote(approval.id, e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => decide(approval.id, "approve")}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => decide(approval.id, "reject")}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </AnyGrid>
        ))}
      </AnyGrid>
    </Box>
  );
}
