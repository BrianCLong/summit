/**
 * PolicyPreflightCard - Interactive tool UI for running policy preflight checks.
 *
 * Features:
 * - Environment selector (dev/staging/prod)
 * - Multi-select tool picker (loaded from server allowlist)
 * - Rationale text field
 * - Progressive disclosure: shows verdict first, details expandable
 * - Downloadable JSON evidence bundle
 * - Clear error states for validation, deny, and server errors
 * - No secret leakage: only displays tool names and verdicts
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as AllowIcon,
  Block as DenyIcon,
} from '@mui/icons-material';
import AppCard, { type AppCardStatus } from './AppCard';

type Environment = 'dev' | 'staging' | 'prod';

interface ToolVerdict {
  tool: string;
  allowed: boolean;
  reason: string;
}

interface PreflightResult {
  verdict: 'ALLOW' | 'DENY' | 'PARTIAL';
  environment: Environment;
  toolVerdicts: ToolVerdict[];
  evidenceId: string;
  timestamp: string;
  dryRun: boolean;
}

const API_BASE = '/api/app-surface';

const PolicyPreflightCard: React.FC = () => {
  // Form state
  const [environment, setEnvironment] = useState<Environment>('dev');
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [rationale, setRationale] = useState('');
  const [dryRun, setDryRun] = useState(false);

  // Result state
  const [status, setStatus] = useState<AppCardStatus>('idle');
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load available tools when environment changes
  useEffect(() => {
    let cancelled = false;
    setAvailableTools([]);
    setSelectedTools([]);

    fetch(`${API_BASE}/allowlist/${environment}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.tools)) {
          setAvailableTools(data.tools);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableTools([]);
      });

    return () => {
      cancelled = true;
    };
  }, [environment]);

  const handleToolToggle = useCallback((tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (selectedTools.length === 0) {
      setError('Select at least one tool.');
      return;
    }
    if (rationale.trim().length === 0) {
      setError('Rationale is required.');
      return;
    }

    setStatus('pending');

    try {
      const res = await fetch(`${API_BASE}/preflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment,
          tools: selectedTools,
          rationale: rationale.trim(),
          dryRun,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStatus('error');
        setError(body?.message ?? `Server error (${res.status})`);
        return;
      }

      const data: PreflightResult = await res.json();
      setResult(data);
      setStatus(data.verdict === 'ALLOW' ? 'success' : 'denied');
    } catch {
      setStatus('error');
      setError('Network error. Could not reach the server.');
    }
  }, [environment, selectedTools, rationale, dryRun]);

  const verdictSummary = result
    ? `${result.verdict} - ${result.toolVerdicts.filter((v) => v.allowed).length}/${result.toolVerdicts.length} tools allowed`
    : 'Check which tools are allowed before executing';

  return (
    <AppCard
      title="Policy Preflight Runner"
      summary={verdictSummary}
      status={status}
      evidenceJson={result ? result : null}
      evidenceId={result?.evidenceId}
      detailsContent={
        result ? (
          <List dense disablePadding>
            {result.toolVerdicts.map((v) => (
              <ListItem key={v.tool} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {v.allowed ? (
                    <AllowIcon fontSize="small" color="success" />
                  ) : (
                    <DenyIcon fontSize="small" color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={v.tool}
                  secondary={v.reason}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        ) : null
      }
    >
      <Box component="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSubmit(); }}>
        {/* Environment selector */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <InputLabel id="env-label">Environment</InputLabel>
          <Select
            labelId="env-label"
            value={environment}
            label="Environment"
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            data-testid="env-select"
          >
            <MenuItem value="dev">dev</MenuItem>
            <MenuItem value="staging">staging</MenuItem>
            <MenuItem value="prod">prod</MenuItem>
          </Select>
        </FormControl>

        {/* Tool multi-select */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" mb={0.5}>
            Select tools
          </Typography>
          <FormGroup sx={{ maxHeight: 160, overflowY: 'auto' }}>
            {availableTools.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
                No tools available for this environment.
              </Typography>
            ) : (
              availableTools.map((tool) => (
                <FormControlLabel
                  key={tool}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedTools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                    />
                  }
                  label={<Typography variant="body2">{tool}</Typography>}
                />
              ))
            )}
          </FormGroup>
        </FormControl>

        {/* Rationale */}
        <TextField
          label="Rationale"
          placeholder="Why do you need these tools?"
          multiline
          rows={2}
          fullWidth
          size="small"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          inputProps={{ maxLength: 2000 }}
          sx={{ mb: 1.5 }}
          data-testid="rationale-input"
        />

        {/* Dry run toggle */}
        <FormControlLabel
          control={<Switch size="small" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />}
          label={<Typography variant="body2">Dry run</Typography>}
          sx={{ mb: 1 }}
        />

        {error && (
          <FormHelperText error sx={{ mb: 1 }}>
            {error}
          </FormHelperText>
        )}

        <Button
          type="submit"
          variant="contained"
          size="small"
          fullWidth
          disabled={status === 'pending'}
          startIcon={status === 'pending' ? <CircularProgress size={16} /> : null}
          data-testid="preflight-submit"
        >
          {status === 'pending' ? 'Checking...' : 'Run Preflight Check'}
        </Button>
      </Box>
    </AppCard>
  );
};

export default PolicyPreflightCard;
