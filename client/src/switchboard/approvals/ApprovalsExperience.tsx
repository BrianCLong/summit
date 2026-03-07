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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorOutlineIcon,
  Gavel as GavelIcon,
  LockClock as LockClockIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { AuditTimeline } from "./AuditTimeline";
import { submitDecision, useAbacClaims, useApprovalDetails, useApprovalsData } from "./hooks";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ApprovalRecord, ApprovalStatus } from "./types";

const REQUIRED_CLAIMS = ["approval:review"];

const statusColor: Record<ApprovalStatus, "info" | "success" | "error" | "warning"> = {
  pending: "info",
  awaiting_second: "warning",
  approved: "success",
  denied: "error",
  escalated: "warning",
};

export default function ApprovalsExperience() {
  const { approvals, loading, error, refresh } = useApprovalsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ApprovalStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  const displayApprovals = useMemo(
    () =>
      approvals.map((item) =>
        optimisticStatuses[item.id] ? { ...item, status: optimisticStatuses[item.id] } : item
      ),
    [approvals, optimisticStatuses]
  );

  useEffect(() => {
    if (!selectedId && displayApprovals.length) {
      setSelectedId(displayApprovals[0].id);
    }
  }, [displayApprovals, selectedId]);

  const {
    detail,
    timeline,
    loading: detailLoading,
  } = useApprovalDetails(selectedId, displayApprovals);
  const abac = useAbacClaims(REQUIRED_CLAIMS);
  const requiresDualClaim = detail?.requiresDualControl ?? false;
  const hasDualClaim = abac.claims.includes("approval:dual-control");

  const handleDecision = async (action: "approve" | "deny") => {
    if (!detail) return;
    const trimmed = rationale.trim();
    if (trimmed.length < 8) {
      setFormError("Add a rationale with at least 8 characters to satisfy audit policy.");
      return;
    }
    if (requiresDualClaim && !hasDualClaim) {
      setFormError("Dual-control is enforced and your ABAC claims do not allow approvals.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const result = await submitDecision(detail, action, trimmed);
      const approvalsRemaining =
        (detail.approvalsRequired || 1) -
        (result.approvalsCompleted || detail.approvalsCompleted || 0);
      const needsPartner = detail.requiresDualControl && approvalsRemaining > 0;
      const nextStatus: ApprovalStatus =
        needsPartner && action === "approve"
          ? "awaiting_second"
          : (result.status as ApprovalStatus) || action;
      setOptimisticStatuses((prev) => ({ ...prev, [detail.id]: nextStatus }));
      setBanner(
        needsPartner
          ? "Dual-control enforced: awaiting co-signer before execution."
          : "Decision recorded and propagated to the workflow."
      );
      setRationale("");
      await refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setFormError(err?.message || "Unable to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (abac.loading) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 3 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Resolving ABAC claims…</Typography>
      </Stack>
    );
  }

  if (!abac.allowed) {
    return (
      <Alert
        severity="warning"
        icon={<ErrorOutlineIcon fontSize="inherit" />}
        sx={{ borderRadius: 2, border: "1px solid hsl(var(--stroke-strong))" }}
      >
        You are missing the required ABAC claims ({REQUIRED_CLAIMS.join(", ")}) to review approvals.
        Request access or escalate to a privileged reviewer.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
        backgroundColor: "hsl(var(--surface-subtle))",
        p: 2,
        borderRadius: 2,
        border: "1px solid hsl(var(--stroke-strong))",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h6">Approvals queue</Typography>
            <Typography variant="body2" color="text.secondary">
              ABAC-guarded switchboard for preflighted changes and disclosures.
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refresh()}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        {banner ? (
          <Alert
            severity="info"
            onClose={() => setBanner(null)}
            icon={<GavelIcon fontSize="inherit" />}
          >
            {banner}
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />}>
            {error}
          </Alert>
        ) : null}

        <Card
          variant="outlined"
          sx={{
            backgroundColor: "hsl(var(--surface-elevated))",
            borderColor: "hsl(var(--stroke-strong))",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <List dense disablePadding>
              {displayApprovals.map((item) => {
                const secondary =
                  item.requiresDualControl && !hasDualClaim
                    ? "Dual control enforced • approval guarded"
                    : item.reason || "No description";
                return (
                  <ListItemButton
                    key={item.id}
                    selected={item.id === selectedId}
                    onClick={() => setSelectedId(item.id)}
                    sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5 }}
                  >
                    <Chip
                      size="small"
                      label={item.status.replace("_", " ")}
                      color={statusColor[item.status] || "info"}
                    />
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography variant="body1" fontWeight={600}>
                            {item.action}
                          </Typography>
                          {item.requiresDualControl ? (
                            <Tooltip title="Dual-control enforced">
                              <LockClockIcon fontSize="small" color="warning" />
                            </Tooltip>
                          ) : null}
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Run {item.runId || "n/a"} • Requested by {item.requester} • {secondary}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
              {!displayApprovals.length && (
                <Box sx={{ p: 2 }}>
                  <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
                    Queue is clear. No pending approvals.
                  </Alert>
                </Box>
              )}
            </List>
          </CardContent>
        </Card>
      </Stack>

      <Card
        variant="outlined"
        sx={{
          backgroundColor: "hsl(var(--surface-elevated))",
          borderColor: "hsl(var(--stroke-strong))",
        }}
      >
        <CardContent>
          {detailLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Loading approval detail…</Typography>
            </Stack>
          ) : null}
          {detail ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={detail.status.replace("_", " ")}
                  color={statusColor[detail.status] || "info"}
                />
                <Chip size="small" variant="outlined" label={`Run ${detail.runId || "n/a"}`} />
                <Chip size="small" variant="outlined" label={detail.action} />
              </Stack>
              <Typography variant="h6">{detail.reason || "Approval detail"}</Typography>
              <Typography variant="body2" color="text.secondary">
                Requested by <strong>{detail.requester}</strong>{" "}
                {detail.createdAt ? `on ${new Date(detail.createdAt).toLocaleString()}` : ""}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  label={`Approvals ${detail.approvalsCompleted}/${detail.approvalsRequired}`}
                  color={
                    detail.approvalsCompleted >= detail.approvalsRequired ? "success" : "default"
                  }
                />
                {detail.requiresDualControl ? (
                  <Chip
                    size="small"
                    icon={<LockClockIcon fontSize="small" />}
                    label="Dual-control"
                    color={hasDualClaim ? "warning" : "default"}
                  />
                ) : null}
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2">Decision</Typography>
                <TextField
                  label="Rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Document why you are approving or denying"
                  multiline
                  minRows={3}
                  error={Boolean(formError)}
                  helperText={formError || "Required for audit and dual-control workflows"}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    disabled={submitting}
                    onClick={() => handleDecision("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CloseIcon />}
                    disabled={submitting}
                    onClick={() => handleDecision("deny")}
                  >
                    Deny
                  </Button>
                </Stack>
                {requiresDualClaim && !hasDualClaim ? (
                  <Alert
                    severity="warning"
                    icon={<LockClockIcon fontSize="inherit" />}
                    sx={{ mt: 1 }}
                  >
                    Dual-control enforced. A reviewer with <code>approval:dual-control</code> must
                    co-sign before execution.
                  </Alert>
                ) : null}
              </Stack>

              <Divider />
              <AuditTimeline events={timeline} />
            </Stack>
          ) : (
            <Alert severity="info" icon={<ErrorOutlineIcon fontSize="inherit" />}>
              Select an approval to review details, audit trail, and preflight readiness.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
