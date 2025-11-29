import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const defaultSchemaContext = {
  nodeLabels: ['Person', 'Organization', 'Document'],
  relationshipTypes: ['ASSOCIATED_WITH', 'CONNECTED_TO'],
  tenantId: 'demo-tenant',
  userId: 'demo-user',
};

function recordTelemetry(eventName, payload) {
  const telemetry =
    (window).__telemetry || ((window).__telemetry = { nlGraphExplanation: [] });
  telemetry.nlGraphExplanation.push({
    event: eventName,
    ts: Date.now(),
    ...payload,
  });
}

export default function NlGraphQueryExplainer() {
  const [prompt, setPrompt] = useState('Show me suspicious payments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState({ rationale: true, evidence: false });

  const confidenceChip = useMemo(() => {
    if (!result?.explanationDetails) return null;
    const pct = Math.round(result.explanationDetails.confidence * 100);
    const color = pct > 80 ? 'success' : pct > 60 ? 'warning' : 'default';
    return (
      <Chip
        label={`Confidence ${pct}%`}
        color={color}
        size="small"
        sx={{ ml: 1 }}
        data-testid="confidence-chip"
      />
    );
  }, [result?.explanationDetails]);

  const runCompile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/ai/nl-graph-query/compile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          schemaContext: defaultSchemaContext,
          verbose: true,
        }),
      });
      const json = await response.json();
      if (!response.ok || json.code) {
        throw new Error(json.message || 'Unable to compile prompt');
      }
      setResult(json);
      recordTelemetry('explanation_generated', {
        confidence: json.explanationDetails?.confidence,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    recordTelemetry('explanation_toggled', {
      section: key,
      expanded: !expanded[key],
      confidence: result?.explanationDetails?.confidence,
    });
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="h6">NL Graph Copilot Explanation</Typography>
          <Tooltip title="Generated from the prompt-to-Cypher compiler with evidence snippets">
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
          {confidenceChip}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Capture model rationale, evidence, and confidence alongside compiled Cypher.
        </Typography>
        <Box display="flex" gap={1} alignItems="flex-start" mb={1}>
          <TextField
            label="Ask the copilot"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            fullWidth
            size="small"
          />
          <Button onClick={runCompile} variant="contained" disabled={loading || !prompt.trim()}>
            Explain
          </Button>
        </Box>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} data-testid="compile-error">
            {error}
          </Alert>
        )}
        {result && !error && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Generated Cypher
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                p: 1.5,
                borderRadius: 1,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {result.cypher}
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Accordion expanded={expanded.rationale} onChange={() => toggle('rationale')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Model Rationale</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.explanationDetails?.rationale?.length ? (
                  <ul>
                    {result.explanationDetails.rationale.map((item, idx) => (
                      <li key={idx} data-testid="rationale-item">
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No rationale provided.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
            <Accordion expanded={expanded.evidence} onChange={() => toggle('evidence')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Evidence with sources</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.explanationDetails?.evidence?.length ? (
                  result.explanationDetails.evidence.map((item, idx) => (
                    <Box
                      key={idx}
                      mb={1}
                      p={1}
                      borderRadius={1}
                      sx={{ backgroundColor: '#f8fafc' }}
                      data-testid="evidence-item"
                    >
                      <Box display="flex" gap={1} alignItems="center" mb={0.5}>
                        <Chip label={item.source} size="small" color="info" />
                        <Tooltip title={item.reason} placement="top" arrow>
                          <InfoOutlinedIcon fontSize="small" color="action" />
                        </Tooltip>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.snippet}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No evidence captured.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
