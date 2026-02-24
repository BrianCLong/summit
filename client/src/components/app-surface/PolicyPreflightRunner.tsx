/**
 * PolicyPreflightRunner - Interactive embedded tool surface
 *
 * Allows users to:
 *  - Choose environment (dev/staging/prod)
 *  - Select tools (multi-select from allowlist)
 *  - Enter rationale
 *  - Submit policy preflight check
 *  - View ALLOW/DENY verdict + download evidence
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { PlayArrow as RunIcon } from '@mui/icons-material';
import AppCard, { type AppCardStatus, type AppCardResult } from './AppCard';

type Environment = 'dev' | 'staging' | 'prod';

interface ToolOption {
  id: string;
  label: string;
}

const ENV_OPTIONS: { value: Environment; label: string }[] = [
  { value: 'dev', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'prod', label: 'Production' },
];

function getApiBase(): string {
  return import.meta.env.VITE_API_URL || '/api';
}

export default function PolicyPreflightRunner() {
  const [environment, setEnvironment] = useState<Environment>('dev');
  const [availableTools, setAvailableTools] = useState<ToolOption[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [rationale, setRationale] = useState('');
  const [status, setStatus] = useState<AppCardStatus>('pending');
  const [result, setResult] = useState<AppCardResult | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [cardTimestamp] = useState(() => new Date().toISOString());

  // Fetch available tools when environment changes
  useEffect(() => {
    let cancelled = false;
    setToolsLoading(true);
    setSelectedTools([]);
    setError(null);

    fetch(`${getApiBase()}/app-surface/tools/${environment}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load tools: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setAvailableTools(
            (data.tools || []).map((t: string) => ({ id: t, label: t })),
          );
          setToolsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`Failed to load tools for ${environment}: ${err.message}`);
          setAvailableTools([]);
          setToolsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [environment]);

  const handleSubmit = useCallback(async () => {
    if (selectedTools.length === 0) {
      setError('Select at least one tool');
      return;
    }
    if (!rationale.trim()) {
      setError('Rationale is required');
      return;
    }

    setLoading(true);
    setStatus('running');
    setError(null);
    setResult(undefined);

    try {
      const response = await fetch(`${getApiBase()}/app-surface/preflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment,
          tools: selectedTools,
          rationale: rationale.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      setResult({
        verdict: data.verdict,
        details: {
          reasons: data.reasons,
          allowedTools: data.allowedTools,
          deniedTools: data.deniedTools,
          dryRun: data.dryRun,
        },
        evidenceId: data.evidenceId,
        evidenceJson: JSON.stringify(data, null, 2),
      });
      setStatus(data.verdict === 'ALLOW' ? 'success' : 'denied');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [environment, selectedTools, rationale]);

  const isFormValid = selectedTools.length > 0 && rationale.trim().length > 0;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: 2 }}>
      <AppCard
        id="policy-preflight"
        surface="Policy Preflight Runner"
        title="Policy Preflight Check"
        summary="Verify tool invocation permissions against environment policy before execution."
        status={status}
        timestamp={cardTimestamp}
        result={result}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 1 }}>
          {/* Environment select */}
          <FormControl fullWidth size="small">
            <InputLabel id="env-label">Environment</InputLabel>
            <Select
              labelId="env-label"
              value={environment}
              label="Environment"
              onChange={(e) => setEnvironment(e.target.value as Environment)}
              disabled={loading}
              data-testid="env-select"
            >
              {ENV_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tools multi-select */}
          <FormControl fullWidth size="small">
            <InputLabel id="tools-label">Tools</InputLabel>
            <Select
              labelId="tools-label"
              multiple
              value={selectedTools}
              onChange={(e) => setSelectedTools(e.target.value as string[])}
              input={<OutlinedInput label="Tools" />}
              disabled={loading || toolsLoading}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              data-testid="tools-select"
            >
              {toolsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={16} sx={{ mr: 1 }} /> Loading tools...
                </MenuItem>
              ) : availableTools.length === 0 ? (
                <MenuItem disabled>No tools available for this environment</MenuItem>
              ) : (
                availableTools.map((tool) => (
                  <MenuItem key={tool.id} value={tool.id}>
                    {tool.label}
                  </MenuItem>
                ))
              )}
            </Select>
            <FormHelperText>
              Select the tools you want to invoke. All must be allowed for the request to pass.
            </FormHelperText>
          </FormControl>

          {/* Rationale */}
          <TextField
            label="Rationale"
            placeholder="Explain why you need to invoke these tools..."
            multiline
            rows={2}
            fullWidth
            size="small"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            disabled={loading}
            inputProps={{ maxLength: 2000 }}
            data-testid="rationale-input"
          />

          {/* Error display */}
          {error && (
            <Alert severity="error" data-testid="preflight-error">
              {error}
            </Alert>
          )}

          {/* Submit */}
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RunIcon />}
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            data-testid="run-preflight"
          >
            {loading ? 'Checking...' : 'Run Preflight Check'}
          </Button>
        </Box>
      </AppCard>
    </Box>
  );
}
