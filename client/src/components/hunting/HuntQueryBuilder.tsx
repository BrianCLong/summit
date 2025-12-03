/**
 * HuntQueryBuilder
 * Visual query builder for creating custom threat hunting queries
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Divider,
  Autocomplete,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Code as CodeIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  value: string | number | boolean | string[];
  description: string;
}

interface QueryTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  query: string;
  parameters: QueryParameter[];
}

interface HypothesisInput {
  statement: string;
  techniques: string[];
  expectedIndicators: string[];
}

const TEMPLATE_CATEGORIES = [
  { id: 'lateral_movement', label: 'Lateral Movement' },
  { id: 'credential_access', label: 'Credential Access' },
  { id: 'data_exfiltration', label: 'Data Exfiltration' },
  { id: 'persistence', label: 'Persistence' },
  { id: 'command_and_control', label: 'Command & Control' },
  { id: 'insider_threat', label: 'Insider Threat' },
  { id: 'ioc_hunting', label: 'IOC Hunting' },
];

const MITRE_TECHNIQUES = [
  { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
  { id: 'T1021.002', name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement' },
  { id: 'T1110.001', name: 'Password Guessing', tactic: 'Credential Access' },
  { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
  { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' },
  { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration' },
];

const SAMPLE_TEMPLATES: QueryTemplate[] = [
  {
    id: 'lateral_movement_chain',
    name: 'Lateral Movement Chain Detection',
    category: 'lateral_movement',
    description: 'Detects multi-hop lateral movement patterns through the network',
    query: `MATCH path = (source:Entity {id: $start_entity})-[:CONNECTED_TO|ACCESSED*1..$max_hops]->(target:Entity)
WHERE source <> target
  AND ALL(r IN relationships(path) WHERE r.timestamp > datetime() - duration({hours: $time_window_hours}))
RETURN source, target, length(path) as hops
LIMIT 100`,
    parameters: [
      { name: 'start_entity', type: 'string', value: '', description: 'Starting entity ID' },
      { name: 'max_hops', type: 'number', value: 3, description: 'Maximum hops to traverse' },
      { name: 'time_window_hours', type: 'number', value: 24, description: 'Time window in hours' },
    ],
  },
  {
    id: 'credential_spray',
    name: 'Credential Spraying Detection',
    category: 'credential_access',
    description: 'Identifies potential credential spraying attacks',
    query: `MATCH (actor:Entity)-[auth:AUTHENTICATED]->(target:Entity)
WHERE auth.timestamp > datetime() - duration({minutes: $time_window_minutes})
  AND auth.status = 'FAILED'
WITH actor, count(DISTINCT target) as unique_targets, count(*) as total_attempts
WHERE total_attempts >= $threshold_failures
  AND unique_targets >= $unique_target_threshold
RETURN actor, unique_targets, total_attempts
LIMIT 50`,
    parameters: [
      { name: 'time_window_minutes', type: 'number', value: 30, description: 'Time window in minutes' },
      { name: 'threshold_failures', type: 'number', value: 10, description: 'Minimum failed attempts' },
      { name: 'unique_target_threshold', type: 'number', value: 5, description: 'Minimum unique targets' },
    ],
  },
  {
    id: 'beaconing_detection',
    name: 'C2 Beaconing Pattern Detection',
    category: 'command_and_control',
    description: 'Identifies C2 beaconing patterns through network traffic analysis',
    query: `MATCH (internal:Entity)-[conn:CONNECTED_TO]->(external:Entity {is_external: true})
WHERE conn.timestamp > datetime() - duration({hours: $time_window_hours})
WITH internal, external, count(*) as connection_count
WHERE connection_count >= $min_beacon_count
RETURN internal, external, connection_count
ORDER BY connection_count DESC
LIMIT 50`,
    parameters: [
      { name: 'time_window_hours', type: 'number', value: 24, description: 'Time window in hours' },
      { name: 'min_beacon_count', type: 'number', value: 100, description: 'Minimum beacon count' },
    ],
  },
];

export const HuntQueryBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null);
  const [parameters, setParameters] = useState<QueryParameter[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [hypothesis, setHypothesis] = useState<HypothesisInput>({
    statement: '',
    techniques: [],
    expectedIndicators: [],
  });
  const [newIndicator, setNewIndicator] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleTemplateSelect = useCallback((template: QueryTemplate) => {
    setSelectedTemplate(template);
    setParameters([...template.parameters]);
    setCustomQuery(template.query);
  }, []);

  const handleParameterChange = useCallback((index: number, value: string | number | boolean) => {
    setParameters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  }, []);

  const handleAddIndicator = useCallback(() => {
    if (newIndicator.trim()) {
      setHypothesis((prev) => ({
        ...prev,
        expectedIndicators: [...prev.expectedIndicators, newIndicator.trim()],
      }));
      setNewIndicator('');
    }
  }, [newIndicator]);

  const handleRemoveIndicator = useCallback((index: number) => {
    setHypothesis((prev) => ({
      ...prev,
      expectedIndicators: prev.expectedIndicators.filter((_, i) => i !== index),
    }));
  }, []);

  const buildFinalQuery = useCallback((): string => {
    let query = customQuery;

    // Replace parameters with values
    for (const param of parameters) {
      const placeholder = `$${param.name}`;
      let value: string;

      if (param.type === 'string') {
        value = `'${param.value}'`;
      } else if (param.type === 'array') {
        value = JSON.stringify(param.value);
      } else {
        value = String(param.value);
      }

      query = query.replace(new RegExp(`\\${placeholder}\\b`, 'g'), value);
    }

    return query;
  }, [customQuery, parameters]);

  const handleRunQuery = useCallback(async () => {
    setIsRunning(true);
    setQueryResult(null);

    try {
      const finalQuery = buildFinalQuery();

      // In production, this would call the actual API
      const response = await fetch('/api/v1/hunt/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: finalQuery,
          hypothesis: hypothesis.statement ? hypothesis : undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setQueryResult(JSON.stringify(result, null, 2));
      } else {
        setQueryResult(`Error: ${response.statusText}`);
      }
    } catch (error) {
      setQueryResult(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  }, [buildFinalQuery, hypothesis]);

  const handleCopyQuery = useCallback(() => {
    navigator.clipboard.writeText(buildFinalQuery());
  }, [buildFinalQuery]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon />
        Hunt Query Builder
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Build and execute custom threat hunting queries against the knowledge graph
      </Typography>

      <Grid container spacing={3}>
        {/* Left Panel - Templates & Parameters */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Query Templates
              </Typography>

              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <Tab key={cat.id} label={cat.label} />
                ))}
              </Tabs>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {SAMPLE_TEMPLATES.filter(
                  (t) => t.category === TEMPLATE_CATEGORIES[activeTab]?.id
                ).map((template) => (
                  <Paper
                    key={template.id}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: selectedTemplate?.id === template.id ? 2 : 1,
                      borderColor:
                        selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Parameters */}
          {parameters.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Parameters
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {parameters.map((param, index) => (
                    <TextField
                      key={param.name}
                      label={param.name}
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={param.value}
                      onChange={(e) =>
                        handleParameterChange(
                          index,
                          param.type === 'number'
                            ? parseFloat(e.target.value) || 0
                            : e.target.value
                        )
                      }
                      helperText={param.description}
                      fullWidth
                      size="small"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Hypothesis Builder */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hypothesis (Optional)
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Hypothesis Statement"
                  value={hypothesis.statement}
                  onChange={(e) =>
                    setHypothesis({ ...hypothesis, statement: e.target.value })
                  }
                  multiline
                  rows={2}
                  fullWidth
                  placeholder="e.g., Detect lateral movement via RDP from compromised workstations"
                />

                <Autocomplete
                  multiple
                  options={MITRE_TECHNIQUES}
                  getOptionLabel={(option) => `${option.id}: ${option.name}`}
                  value={MITRE_TECHNIQUES.filter((t) =>
                    hypothesis.techniques.includes(t.id)
                  )}
                  onChange={(_, values) =>
                    setHypothesis({
                      ...hypothesis,
                      techniques: values.map((v) => v.id),
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="MITRE ATT&CK Techniques" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.id}
                        size="small"
                        color="primary"
                      />
                    ))
                  }
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Expected Indicators
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      value={newIndicator}
                      onChange={(e) => setNewIndicator(e.target.value)}
                      placeholder="Add indicator..."
                      size="small"
                      fullWidth
                      onKeyPress={(e) => e.key === 'Enter' && handleAddIndicator()}
                    />
                    <IconButton onClick={handleAddIndicator} color="primary">
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {hypothesis.expectedIndicators.map((indicator, index) => (
                      <Chip
                        key={index}
                        label={indicator}
                        onDelete={() => handleRemoveIndicator(index)}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Panel - Query Editor & Results */}
        <Grid item xs={12} md={7}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Query Editor</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Copy Query">
                    <IconButton onClick={handleCopyQuery} size="small">
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Save Template">
                    <IconButton size="small">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <TextField
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                multiline
                rows={12}
                fullWidth
                sx={{
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RunIcon />}
                  onClick={handleRunQuery}
                  disabled={isRunning || !customQuery.trim()}
                >
                  {isRunning ? 'Running...' : 'Run Query'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Results
              </Typography>

              {queryResult ? (
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {queryResult}
                  </pre>
                </Paper>
              ) : (
                <Alert severity="info">
                  Run a query to see results here
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HuntQueryBuilder;
