import React, { useMemo, useState } from "react";
import {
  Alert,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

interface BillingPanelProps {
  tenantId: string;
}

export function PartnerBillingPanel({ tenantId }: BillingPanelProps) {
  const defaultStart = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
  }, []);

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const downloadReport = async (format: "json" | "csv") => {
    setMessage("");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format,
      });
      if (start) params.append("start", start);
      if (end) params.append("end", end);

      const response = await fetch(`/api/tenants/${tenantId}/billing/report?${params.toString()}`);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to download report");
      }

      if (format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tenant-${tenantId}-billing.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        setMessage("CSV export downloaded");
        return;
      }

      const json = await response.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tenant-${tenantId}-billing.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage("JSON export downloaded");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Billing Exports" subheader={`Tenant: ${tenantId}`} />
      <CardContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Download invoice-ready usage and cost reports with meter-level and cost attribution
          coverage.
        </Typography>
        <Stack spacing={2} mt={2}>
          <TextField
            label="Period start (ISO date)"
            value={start}
            type="date"
            onChange={(e) => setStart(e.target.value)}
            inputProps={{ "data-testid": "billing-start" }}
          />
          <TextField
            label="Period end (optional, ISO date)"
            value={end}
            type="date"
            onChange={(e) => setEnd(e.target.value)}
            inputProps={{ "data-testid": "billing-end" }}
          />
          {message && (
            <Alert severity={message.includes("downloaded") ? "success" : "error"}>{message}</Alert>
          )}
        </Stack>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          onClick={() => downloadReport("json")}
          disabled={loading}
          data-testid="download-billing-json"
        >
          {loading ? <CircularProgress size={18} /> : "Download JSON"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => downloadReport("csv")}
          disabled={loading}
          data-testid="download-billing-csv"
        >
          {loading ? <CircularProgress size={18} /> : "Download CSV"}
        </Button>
      </CardActions>
    </Card>
  );
}
