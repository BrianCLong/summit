/**
 * AI Copilot Sidebar - Minimum Lovable Product
 *
 * Features:
 * - Natural language query input
 * - Generated Cypher preview with explanation
 * - Cost/complexity estimation
 * - Safety checks with policy explanations
 * - Results with citations and provenance
 * - Hypothesis generation
 * - Narrative building
 *
 * Implements "Auditable by Design" requirements from Wishbook
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Chip,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Collapse,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Link,
} from '@mui/material';
import {
  Send as SendIcon,
  Visibility as PreviewIcon,
  PlayArrow as ExecuteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Block as BlockIcon,
  Code as CodeIcon,
  Article as ArticleIcon,
  Lightbulb as LightbulbIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useMutation, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// GraphQL Queries
const PREVIEW_NL_QUERY = gql`
  query PreviewNLQuery($input: NLQueryInput!) {
    previewNLQuery(input: $input) {
      cypher
      explanation
      estimatedRows
      estimatedCost
      complexity
      warnings
      allowed
      blockReason
      auditId
    }
  }
`;

const EXECUTE_NL_QUERY = gql`
  mutation ExecuteNLQuery($input: NLQueryInput!) {
    executeNLQuery(input: $input) {
      records
      summary {
        recordCount
        executionTime
      }
      citations
      auditId
    }
  }
`;

const GENERATE_HYPOTHESES = gql`
  query GenerateHypotheses($input: HypothesisInput!) {
    generateHypotheses(input: $input) {
      id
      statement
      confidence
      supportingEvidence {
        id
        type
        description
        strength
      }
      suggestedSteps
    }
  }
`;

const GENERATE_NARRATIVE = gql`
  query GenerateNarrative($input: NarrativeInput!) {
    generateNarrative(input: $input) {
      id
      title
      content
      keyFindings
      citations
      confidence
      auditId
    }
  }
`;

interface CopilotSidebarProps {
  investigationId: string;
  userId?: string;
  onEntityClick?: (entityId: string) => void;
}

interface CypherPreview {
  cypher: string;
  explanation: string;
  estimatedRows: number;
  estimatedCost: number;
  complexity: string;
  warnings?: string[];
  allowed: boolean;
  blockReason?: string;
  auditId?: string;
}

interface ExecutionResult {
  records: any[];
  summary: {
    recordCount: number;
    executionTime: number;
  };
  citations: string[];
  auditId?: string;
}

export default function CopilotSidebar({
  investigationId,
  userId,
  onEntityClick,
}: CopilotSidebarProps) {
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<CypherPreview | null>(null);
  const [results, setResults] = useState<ExecutionResult | null>(null);
  const [showCypher, setShowCypher] = useState(false);
  const [activeTab, setActiveTab] = useState<'query' | 'hypotheses' | 'narrative'>('query');

  const [previewQuery, { loading: previewing }] = useLazyQuery(PREVIEW_NL_QUERY, {
    onCompleted: (data) => {
      setPreview(data.previewNLQuery);
      setResults(null);
    },
    onError: (error) => {
      console.error('Preview failed:', error);
    },
  });

  const [executeQuery, { loading: executing }] = useMutation(EXECUTE_NL_QUERY, {
    onCompleted: (data) => {
      setResults(data.executeNLQuery);
    },
    onError: (error) => {
      console.error('Execution failed:', error);
    },
  });

  const [generateHypotheses, { data: hypothesesData, loading: generatingHypotheses }] =
    useLazyQuery(GENERATE_HYPOTHESES);

  const [generateNarrative, { data: narrativeData, loading: generatingNarrative }] =
    useLazyQuery(GENERATE_NARRATIVE);

  const handlePreview = () => {
    if (!query.trim()) return;

    previewQuery({
      variables: {
        input: {
          query: query.trim(),
          investigationId,
          userId,
          dryRun: true,
        },
      },
    });
  };

  const handleExecute = () => {
    if (!preview || !preview.allowed) return;

    executeQuery({
      variables: {
        input: {
          query: query.trim(),
          investigationId,
          userId,
          dryRun: false,
        },
      },
    });
  };

  const handleGenerateHypotheses = () => {
    generateHypotheses({
      variables: {
        input: {
          investigationId,
          count: 3,
        },
      },
    });
  };

  const handleGenerateNarrative = () => {
    generateNarrative({
      variables: {
        input: {
          investigationId,
          style: 'ANALYTICAL',
        },
      },
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          🤖 AI Copilot
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Ask questions in natural language. Preview and approve queries before execution.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Tab Selection */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            size="small"
            variant={activeTab === 'query' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('query')}
            startIcon={<CodeIcon />}
          >
            Query
          </Button>
          <Button
            size="small"
            variant={activeTab === 'hypotheses' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('hypotheses')}
            startIcon={<LightbulbIcon />}
          >
            Hypotheses
          </Button>
          <Button
            size="small"
            variant={activeTab === 'narrative' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('narrative')}
            startIcon={<ArticleIcon />}
          >
            Narrative
          </Button>
        </Stack>

        {/* Query Tab */}
        {activeTab === 'query' && (
          <>
            {/* Query Input */}
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ask me anything about this investigation...

Examples:
• Show me all persons connected to financial entities
• Find entities with more than 5 connections
• What are the most recent entities added?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={previewing || executing}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={!query.trim() || previewing || executing}
                fullWidth
              >
                {previewing ? 'Generating...' : 'Preview Query'}
              </Button>
            </Stack>

            {/* Preview Section */}
            {preview && (
              <Box sx={{ mb: 2 }}>
                {/* Policy Block Message */}
                {!preview.allowed && (
                  <Alert severity="error" icon={<BlockIcon />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Query Blocked
                    </Typography>
                    <Typography variant="body2">{preview.blockReason}</Typography>
                    {preview.warnings && preview.warnings.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block" gutterBottom>
                          Reasons:
                        </Typography>
                        {preview.warnings.map((warning, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            • {warning}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Audit ID: {preview.auditId}
                    </Typography>
                  </Alert>
                )}

                {/* Allowed Preview */}
                {preview.allowed && (
                  <>
                    <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Query Ready for Execution</Typography>
                    </Alert>

                    {/* Explanation */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <InfoIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2">What this query does:</Typography>
                      </Stack>
                      <Typography variant="body2">{preview.explanation}</Typography>
                    </Paper>

                    {/* Metrics */}
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip
                        label={`~${preview.estimatedRows} rows`}
                        size="small"
                        icon={<InfoIcon />}
                      />
                      <Chip
                        label={`Cost: ${preview.estimatedCost} units`}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={`${preview.complexity} complexity`}
                        size="small"
                        color={getComplexityColor(preview.complexity)}
                      />
                    </Stack>

                    {/* Warnings */}
                    {preview.warnings && preview.warnings.length > 0 && (
                      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                        <Typography variant="caption" display="block" gutterBottom>
                          Warnings:
                        </Typography>
                        {preview.warnings.map((warning, idx) => (
                          <Typography key={idx} variant="caption" display="block">
                            • {warning}
                          </Typography>
                        ))}
                      </Alert>
                    )}

                    {/* Cypher Code */}
                    <Box sx={{ mb: 2 }}>
                      <Button
                        size="small"
                        startIcon={showCypher ? <CollapseIcon /> : <ExpandIcon />}
                        onClick={() => setShowCypher(!showCypher)}
                      >
                        {showCypher ? 'Hide' : 'Show'} Generated Cypher
                      </Button>
                      <Collapse in={showCypher}>
                        <Paper variant="outlined" sx={{ mt: 1 }}>
                          <SyntaxHighlighter language="cypher" style={github}>
                            {preview.cypher}
                          </SyntaxHighlighter>
                        </Paper>
                      </Collapse>
                    </Box>

                    {/* Execute Button */}
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ExecuteIcon />}
                      onClick={handleExecute}
                      disabled={executing}
                      fullWidth
                    >
                      {executing ? 'Executing...' : 'Execute Query'}
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Results Section */}
            {results && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Results
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={`${results.summary.recordCount} records`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`${results.summary.executionTime.toFixed(0)}ms`}
                    size="small"
                  />
                  <Chip
                    label={`${results.citations.length} entities`}
                    color="primary"
                    size="small"
                  />
                </Stack>

                {/* Citations */}
                {results.citations.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Entity Citations:
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {results.citations.map((entityId) => (
                        <Chip
                          key={entityId}
                          label={entityId}
                          size="small"
                          onClick={() => onEntityClick?.(entityId)}
                          clickable
                        />
                      ))}
                    </Stack>
                  </Paper>
                )}

                {/* Results Data */}
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                  <List dense>
                    {results.records.map((record, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={`Record ${idx + 1}`}
                          secondary={
                            <Typography
                              component="pre"
                              variant="caption"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {JSON.stringify(record, null, 2)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Audit ID: {results.auditId}
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Hypotheses Tab */}
        {activeTab === 'hypotheses' && (
          <>
            <Typography variant="body2" gutterBottom>
              Generate AI-powered hypotheses based on current investigation data.
            </Typography>

            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleGenerateHypotheses}
              disabled={generatingHypotheses}
              fullWidth
              sx={{ my: 2 }}
            >
              {generatingHypotheses ? 'Generating Hypotheses...' : 'Generate Hypotheses'}
            </Button>

            {generatingHypotheses && <LinearProgress sx={{ mb: 2 }} />}

            {hypothesesData?.generateHypotheses && (
              <Stack spacing={2}>
                {hypothesesData.generateHypotheses.map((hypothesis: any) => (
                  <Paper key={hypothesis.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {hypothesis.statement}
                      </Typography>
                      <Chip
                        label={`${(hypothesis.confidence * 100).toFixed(0)}%`}
                        size="small"
                        color={hypothesis.confidence > 0.7 ? 'success' : 'warning'}
                      />
                    </Stack>

                    {hypothesis.supportingEvidence.length > 0 && (
                      <Box sx={{ ml: 2, mt: 1 }}>
                        <Typography variant="caption" display="block" gutterBottom>
                          Evidence:
                        </Typography>
                        {hypothesis.supportingEvidence.map((evidence: any) => (
                          <Typography key={evidence.id} variant="caption" display="block">
                            • {evidence.description} ({evidence.type})
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {hypothesis.suggestedSteps.length > 0 && (
                      <Box sx={{ ml: 2, mt: 1 }}>
                        <Typography variant="caption" display="block" gutterBottom>
                          Next Steps:
                        </Typography>
                        {hypothesis.suggestedSteps.map((step: string, idx: number) => (
                          <Typography key={idx} variant="caption" display="block">
                            {idx + 1}. {step}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}

        {/* Narrative Tab */}
        {activeTab === 'narrative' && (
          <>
            <Typography variant="body2" gutterBottom>
              Generate a comprehensive narrative report of the investigation.
            </Typography>

            <Button
              variant="contained"
              startIcon={<ArticleIcon />}
              onClick={handleGenerateNarrative}
              disabled={generatingNarrative}
              fullWidth
              sx={{ my: 2 }}
            >
              {generatingNarrative ? 'Generating Narrative...' : 'Generate Narrative'}
            </Button>

            {generatingNarrative && <LinearProgress sx={{ mb: 2 }} />}

            {narrativeData?.generateNarrative && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {narrativeData.generateNarrative.title}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={`${(narrativeData.generateNarrative.confidence * 100).toFixed(0)}% confidence`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={`${narrativeData.generateNarrative.citations.length} entities`}
                    size="small"
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography
                  variant="body2"
                  component="div"
                  sx={{ whiteSpace: 'pre-line', mb: 2 }}
                >
                  {narrativeData.generateNarrative.content}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Key Findings:
                </Typography>
                {narrativeData.generateNarrative.keyFindings.map(
                  (finding: string, idx: number) => (
                    <Typography key={idx} variant="body2" sx={{ ml: 2 }}>
                      • {finding}
                    </Typography>
                  )
                )}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                  Audit ID: {narrativeData.generateNarrative.auditId}
                </Typography>
              </Paper>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
