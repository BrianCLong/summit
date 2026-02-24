/**
 * AppCard - Generic embedded tool UI card for chat surfaces.
 *
 * Renders a card with:
 * - Title, summary, status pill
 * - Expandable details panel (progressive disclosure)
 * - Optional children for form/results content
 * - Downloadable JSON evidence link
 *
 * Mobile-friendly, MUI-based, no secret leakage.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Box,
  Button,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

export type AppCardStatus = 'idle' | 'pending' | 'success' | 'denied' | 'error';

const STATUS_COLORS: Record<AppCardStatus, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  idle: 'default',
  pending: 'info',
  success: 'success',
  denied: 'error',
  error: 'warning',
};

const STATUS_LABELS: Record<AppCardStatus, string> = {
  idle: 'Ready',
  pending: 'Running...',
  success: 'Allowed',
  denied: 'Denied',
  error: 'Error',
};

export interface AppCardProps {
  title: string;
  summary: string;
  status: AppCardStatus;
  children?: React.ReactNode;
  detailsContent?: React.ReactNode;
  evidenceJson?: object | null;
  evidenceId?: string;
}

const AppCard: React.FC<AppCardProps> = ({
  title,
  summary,
  status,
  children,
  detailsContent,
  evidenceJson,
  evidenceId,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleDownloadEvidence = () => {
    if (!evidenceJson) return;
    const blob = new Blob([JSON.stringify(evidenceJson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${evidenceId ?? 'bundle'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        maxWidth: 480,
        width: '100%',
        mx: 'auto',
        my: 1,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {title}
          </Typography>
          <Chip
            label={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
            size="small"
            data-testid="app-card-status"
          />
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={1}>
          {summary}
        </Typography>

        {children}

        {detailsContent && (
          <>
            <Box display="flex" alignItems="center" mt={1}>
              <Typography variant="caption" color="text.secondary">
                Details
              </Typography>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'collapse details' : 'expand details'}
                data-testid="app-card-toggle"
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Box mt={1}>{detailsContent}</Box>
            </Collapse>
          </>
        )}

        {evidenceJson && (
          <Box mt={1}>
            <Button
              variant="text"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadEvidence}
              data-testid="app-card-download"
            >
              Download Evidence
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AppCard;
