/**
 * AppCard - Generic embedded tool UI for chat messages.
 *
 * Renders a card with:
 *  - Title, summary, status pill
 *  - An optional form with validated inputs
 *  - A results panel with downloadable JSON evidence
 *  - Progressive disclosure: policy decision first, details expandable
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Collapse,
  IconButton,
  Button,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  Error as ErrorIcon,
  PlayArrow as RunningIcon,
} from '@mui/icons-material';

export type AppCardStatus = 'pending' | 'running' | 'success' | 'denied' | 'error';

export interface AppCardResult {
  verdict?: 'ALLOW' | 'DENY';
  details?: Record<string, unknown>;
  evidenceId?: string;
  evidenceJson?: string;
}

export interface AppCardProps {
  id: string;
  surface: string;
  title: string;
  summary: string;
  status: AppCardStatus;
  timestamp: string;
  result?: AppCardResult;
  children?: React.ReactNode;
  onDownloadEvidence?: () => void;
}

const STATUS_CONFIG: Record<
  AppCardStatus,
  { color: 'default' | 'primary' | 'success' | 'error' | 'warning'; icon: React.ReactElement; label: string }
> = {
  pending: { color: 'default', icon: <PendingIcon fontSize="small" />, label: 'Pending' },
  running: { color: 'primary', icon: <RunningIcon fontSize="small" />, label: 'Running' },
  success: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Allowed' },
  denied: { color: 'error', icon: <CancelIcon fontSize="small" />, label: 'Denied' },
  error: { color: 'warning', icon: <ErrorIcon fontSize="small" />, label: 'Error' },
};

function downloadJson(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AppCard({
  id,
  surface,
  title,
  summary,
  status,
  timestamp,
  result,
  children,
  onDownloadEvidence,
}: AppCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[status];

  const handleDownload = useCallback(() => {
    if (onDownloadEvidence) {
      onDownloadEvidence();
      return;
    }
    if (result?.evidenceJson) {
      downloadJson(result.evidenceJson, `evidence-${result.evidenceId || id}.json`);
    }
  }, [onDownloadEvidence, result, id]);

  return (
    <Card
      data-testid={`app-card-${id}`}
      sx={{
        maxWidth: 600,
        width: '100%',
        border: '1px solid',
        borderColor:
          status === 'denied' ? 'error.main' :
          status === 'success' ? 'success.main' :
          'divider',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header: title + status pill */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {surface} &middot; {new Date(timestamp).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            icon={statusCfg.icon}
            label={statusCfg.label}
            color={statusCfg.color}
            size="small"
            sx={{ ml: 1, flexShrink: 0 }}
          />
        </Box>

        {/* Summary */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {summary}
        </Typography>

        {/* Verdict banner (progressive disclosure — shown first) */}
        {result?.verdict && (
          <Alert
            severity={result.verdict === 'ALLOW' ? 'success' : 'error'}
            sx={{ mb: 1 }}
            data-testid="verdict-banner"
          >
            Policy decision: <strong>{result.verdict}</strong>
            {result.evidenceId && (
              <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                (Evidence: {result.evidenceId})
              </Typography>
            )}
          </Alert>
        )}

        {/* Form area — rendered via children */}
        {children}

        {/* Expandable details */}
        {result?.details && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 1 }} onClick={() => setExpanded(!expanded)}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Details
              </Typography>
              <IconButton size="small" aria-label={expanded ? 'Collapse details' : 'Expand details'}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'grey.50',
                  p: 1.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: 300,
                  mt: 0.5,
                }}
              >
                {JSON.stringify(result.details, null, 2)}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>

      {/* Actions */}
      {(result?.evidenceJson || onDownloadEvidence) && (
        <CardActions sx={{ px: 2, py: 1 }}>
          <Tooltip title="Download evidence bundle as JSON">
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              data-testid="download-evidence"
            >
              Download Evidence
            </Button>
          </Tooltip>
        </CardActions>
      )}
    </Card>
  );
}
