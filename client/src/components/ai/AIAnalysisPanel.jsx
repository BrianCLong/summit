import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AIIcon,
  AutoFixHigh as EnhanceIcon,
  Insights as InsightsIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Lightbulb as LightbulbIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Done as DoneIcon,
  Group as CommunityIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useLazyQuery, useMutation, useQuery, useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

// New AI System GraphQL queries and mutations
const AI_EXTRACT_ENTITIES = gql`
  mutation AIExtractEntities($docs: [JSON!]!, $jobId: ID) {
    aiExtractEntities(docs: $docs, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

const AI_RESOLVE_ENTITIES = gql`
  mutation AIResolveEntities($records: [JSON!]!, $threshold: Float, $jobId: ID) {
    aiResolveEntities(records: $records, threshold: $threshold, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

const AI_LINK_PREDICT = gql`
  mutation AILinkPredict($graphSnapshotId: ID!, $topK: Int, $jobId: ID) {
    aiLinkPredict(graphSnapshotId: $graphSnapshotId, topK: $topK, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

const AI_COMMUNITY_DETECT = gql`
  mutation AICommunityDetect($graphSnapshotId: ID!, $jobId: ID) {
    aiCommunityDetect(graphSnapshotId: $graphSnapshotId, jobId: $jobId) {
      id
      kind
      status
      createdAt
    }
  }
`;

const EXPLAIN_ENTITY_RECOGNITION = gql`
  query ExplainEntityRecognition($text: String!, $method: String, $topK: Int) {
    explainEntityRecognition(text: $text, method: $method, topK: $topK) {
      text
      usedMethod
      generatedAt
      entities {
        text
        label
        confidence
        start
        end
      }
      relationships {
        source
        target
        type
        confidence
      }
      explanations {
        entityText
        label
        confidence
        method
        context
        summary
        featureWeights {
          feature
          weight
        }
      }
    }
  }
`;

const GET_AI_JOB = gql`
  query GetAIJob($id: ID!) {
    aiJob(id: $id) {
      id
      kind
      status
      createdAt
      startedAt
      finishedAt
      error
      meta
    }
  }
`;

const GET_INSIGHTS = gql`
  query GetInsights($status: String, $kind: String) {
    insights(status: $status, kind: $kind) {
      id
      jobId
      kind
      payload
      status
      createdAt
      decidedAt
      decidedBy
    }
  }
`;

const APPROVE_INSIGHT = gql`
  mutation ApproveInsight($id: ID!) {
    approveInsight(id: $id) {
      id
      status
      decidedAt
      decidedBy
    }
  }
`;

const REJECT_INSIGHT = gql`
  mutation RejectInsight($id: ID!, $reason: String) {
    rejectInsight(id: $id, reason: $reason) {
      id
      status
      decidedAt
      decidedBy
    }
  }
`;

// Subscriptions for real-time updates
const AI_JOB_PROGRESS = gql`
  subscription AIJobProgress($jobId: ID!) {
    aiJobProgress(jobId: $jobId) {
      id
      kind
      status
      error
    }
  }
`;

const INSIGHT_ADDED = gql`
  subscription InsightAdded($status: String, $kind: String) {
    insightAdded(status: $status, kind: $kind) {
      id
      jobId
      kind
      payload
      status
      createdAt
    }
  }
`;

const AIAnalysisPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [analysisText, setAnalysisText] = useState('');
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGraphSnapshot, setSelectedGraphSnapshot] = useState('demo-snapshot-1');
  const [extractionResults, setExtractionResults] = useState(null);
  const [explainabilityMethod, setExplainabilityMethod] = useState('auto');
  const [explainabilityTopK, setExplainabilityTopK] = useState(5);

  // GraphQL hooks for AI operations
  const [aiExtractEntities] = useMutation(AI_EXTRACT_ENTITIES, {
    onCompleted: (data) => {
      const job = data.aiExtractEntities;
      setActiveJobs((prev) => [...prev, job]);
      setLoading(false);
    },
    onError: (error) => {
      console.error('AI entity extraction failed:', error);
      setLoading(false);
    },
  });

  const [aiResolveEntities] = useMutation(AI_RESOLVE_ENTITIES, {
    onCompleted: (data) => {
      const job = data.aiResolveEntities;
      setActiveJobs((prev) => [...prev, job]);
      setLoading(false);
    },
    onError: (error) => {
      console.error('AI entity resolution failed:', error);
      setLoading(false);
    },
  });

  const [aiLinkPredict] = useMutation(AI_LINK_PREDICT, {
    onCompleted: (data) => {
      const job = data.aiLinkPredict;
      setActiveJobs((prev) => [...prev, job]);
      setLoading(false);
    },
    onError: (error) => {
      console.error('AI link prediction failed:', error);
      setLoading(false);
    },
  });

  const [aiCommunityDetect] = useMutation(AI_COMMUNITY_DETECT, {
    onCompleted: (data) => {
      const job = data.aiCommunityDetect;
      setActiveJobs((prev) => [...prev, job]);
      setLoading(false);
    },
    onError: (error) => {
      console.error('AI community detection failed:', error);
      setLoading(false);
    },
  });

  const [fetchExplainability, { data: explainabilityData, loading: explainabilityLoading, error: explainabilityError }]
    = useLazyQuery(EXPLAIN_ENTITY_RECOGNITION, {
      fetchPolicy: 'no-cache',
    });

  const [approveInsight] = useMutation(APPROVE_INSIGHT, {
    onCompleted: (data) => {
      setInsights((prev) =>
        prev.map((insight) =>
          insight.id === data.approveInsight.id ? data.approveInsight : insight,
        ),
      );
    },
    onError: (error) => {
      console.error('Failed to approve insight:', error);
    },
  });

  const [rejectInsight] = useMutation(REJECT_INSIGHT, {
    onCompleted: (data) => {
      setInsights((prev) =>
        prev.map((insight) =>
          insight.id === data.rejectInsight.id ? data.rejectInsight : insight,
        ),
      );
    },
    onError: (error) => {
      console.error('Failed to reject insight:', error);
    },
  });

  // Query for insights
  const { data: insightsData, refetch: refetchInsights } = useQuery(GET_INSIGHTS, {
    variables: { status: 'PENDING' },
    onCompleted: (data) => {
      setInsights(data.insights);
    },
  });

  // Real-time subscriptions
  useSubscription(INSIGHT_ADDED, {
    variables: { status: 'PENDING' },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data) {
        const newInsight = subscriptionData.data.insightAdded;
        setInsights((prev) => [newInsight, ...prev]);
      }
    },
  });

  // Handler functions for AI operations
  const triggerExplainability = useCallback(
    (override?: { method?: string; topK?: number }) => {
      if (!analysisText.trim()) return;
      const desiredMethod = override?.method ?? explainabilityMethod;
      const desiredTopK = override?.topK ?? explainabilityTopK;

      fetchExplainability({
        variables: {
          text: analysisText,
          method: desiredMethod === 'auto' ? null : desiredMethod,
          topK: desiredTopK,
        },
      });
    },
    [analysisText, explainabilityMethod, explainabilityTopK, fetchExplainability],
  );

  const handleExtractEntities = () => {
    if (!analysisText.trim()) return;
    setLoading(true);
    setExtractionResults(null);

    const docs = [{ id: `doc-${Date.now()}`, text: analysisText }];
    aiExtractEntities({
      variables: {
        docs: docs,
        jobId: `extract-${Date.now()}`,
      },
    });

    triggerExplainability();
  };

  const handleResolveEntities = () => {
    setLoading(true);

    // Create sample entity records from analysis text
    const words = analysisText.split(' ').filter((word) => word.length > 3);
    const records = words.slice(0, 10).map((word, index) => ({
      id: `entity-${index}`,
      name: word,
      attrs: { type: 'extracted' },
    }));

    aiResolveEntities({
      variables: {
        records: records,
        threshold: 0.8,
        jobId: `resolve-${Date.now()}`,
      },
    });
  };

  const handleLinkPrediction = () => {
    setLoading(true);
    aiLinkPredict({
      variables: {
        graphSnapshotId: selectedGraphSnapshot,
        topK: 20,
        jobId: `link-${Date.now()}`,
      },
    });
  };

  const handleCommunityDetection = () => {
    setLoading(true);
    aiCommunityDetect({
      variables: {
        graphSnapshotId: selectedGraphSnapshot,
        jobId: `community-${Date.now()}`,
      },
    });
  };

  const handleApproveInsight = (insightId) => {
    approveInsight({ variables: { id: insightId } });
  };

  const handleRejectInsight = (insightId, reason = 'Not applicable') => {
    rejectInsight({ variables: { id: insightId, reason } });
  };

  // Helper functions
  const getJobStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'QUEUED':
        return 'info';
      case 'RUNNING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <DoneIcon />;
      case 'FAILED':
        return <ErrorIcon />;
      case 'QUEUED':
        return <ScheduleIcon />;
      case 'RUNNING':
        return <CircularProgress size={16} />;
      default:
        return <ScheduleIcon />;
    }
  };

  const getInsightStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    if (explainabilityData?.explainEntityRecognition) {
      const payload = explainabilityData.explainEntityRecognition;
      setExtractionResults({
        entities: (payload.entities || []).map((entity, index) => ({
          id: `extracted-${index}`,
          text: entity.text,
          type: entity.label,
          confidence: entity.confidence,
          start: entity.start,
          end: entity.end,
        })),
        relationships: (payload.relationships || []).map((rel, index) => ({
          id: `relationship-${index}`,
          source: rel.source,
          target: rel.target,
          type: rel.type,
          confidence: rel.confidence,
        })),
        explanations: payload.explanations || [],
        usedMethod: payload.usedMethod,
        generatedAt: payload.generatedAt,
      });
    }
  }, [explainabilityData]);

  useEffect(() => {
    if (!explainabilityLoading && (explainabilityData || explainabilityError)) {
      setLoading(false);
    }
  }, [explainabilityLoading, explainabilityData, explainabilityError]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <AIIcon color="primary" sx={{ fontSize: 32 }} />
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1">
              IntelGraph AI Analysis Platform
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Real-time ML-powered entity extraction, link prediction, and community detection
            </Typography>
          </Grid>
          <Grid item>
            <Badge badgeContent={insights.length} color="warning">
              <Chip
                icon={<LightbulbIcon />}
                label="AI Insights"
                color="primary"
                variant="outlined"
              />
            </Badge>
          </Grid>
          <Grid item>
            <Tooltip title="Refresh insights">
              <IconButton onClick={() => refetchInsights()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Entity Processing" icon={<SearchIcon />} />
          <Tab label="Graph Analytics" icon={<LinkIcon />} />
          <Tab label="Insights Review" icon={<InsightsIcon />} />
          <Tab label="Active Jobs" icon={<ScheduleIcon />} />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Entity Processing Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔍 Text Analysis Input
                  </Typography>
                  <TextField
                    multiline
                    rows={8}
                    fullWidth
                    placeholder="Enter text to analyze for entities and relationships..."
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleExtractEntities}
                    disabled={loading || !analysisText.trim()}
                    startIcon={<SearchIcon />}
                  >
                    Extract Entities & Relationships
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel id="explainability-method-label">Explainability</InputLabel>
                      <Select
                        labelId="explainability-method-label"
                        value={explainabilityMethod}
                        label="Explainability"
                        onChange={(event) => {
                          const nextMethod = event.target.value;
                          setExplainabilityMethod(nextMethod);
                          if (extractionResults) {
                            triggerExplainability({ method: nextMethod });
                          }
                        }}
                      >
                        <MenuItem value="auto">Auto</MenuItem>
                        <MenuItem value="lime">LIME</MenuItem>
                        <MenuItem value="shap">SHAP</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Top features"
                      type="number"
                      value={explainabilityTopK}
                      onChange={(event) => {
                        const nextValue = Math.max(1, Math.min(10, Number(event.target.value) || 1));
                        setExplainabilityTopK(nextValue);
                        if (extractionResults) {
                          triggerExplainability({ topK: nextValue });
                        }
                      }}
                      inputProps={{ min: 1, max: 10 }}
                      sx={{ width: 140 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => triggerExplainability()}
                      disabled={explainabilityLoading || !analysisText.trim()}
                    >
                      Refresh Explainability
                    </Button>
                  </Box>
                  {loading && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Extraction Results
                  </Typography>
                  {extractionResults ? (
                    <>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Entities ({extractionResults.entities.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {extractionResults.entities.map((entity, index) => (
                              <Chip
                                key={`${entity.id}-${index}`}
                                label={`${entity.text} (${entity.type})`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>
                            Relationships ({extractionResults.relationships.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {extractionResults.relationships.map((rel, index) => (
                              <ListItem key={`${rel.id}-${index}`}>
                                <ListItemText
                                  primary={`${rel.source} → ${rel.target}`}
                                  secondary={`Type: ${rel.type} | Confidence: ${(rel.confidence * 100).toFixed(1)}%`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    </>
                  ) : (
                    <Alert severity="info">
                      Enter text above and click "Extract" to see AI-powered entity extraction
                      results
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🧠 Explainable Entity Highlights
                  </Typography>
                  {extractionResults?.usedMethod && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Method: {extractionResults.usedMethod?.toUpperCase?.() || extractionResults.usedMethod} · Updated{' '}
                      {extractionResults.generatedAt
                        ? new Date(extractionResults.generatedAt).toLocaleTimeString()
                        : 'just now'}
                    </Typography>
                  )}
                  {explainabilityError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Failed to load explainability insights: {explainabilityError.message}
                    </Alert>
                  )}
                  {explainabilityLoading && <LinearProgress sx={{ mb: 2 }} />}
                  {extractionResults?.explanations?.length ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {extractionResults.explanations.map((explanation, index) => (
                        <Box
                          key={`${explanation.entityText}-${index}`}
                          sx={{
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 2,
                            backgroundColor: 'background.paper',
                          }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {explanation.entityText}{' '}
                            <Typography component="span" variant="caption" color="text.secondary">
                              ({explanation.label})
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {explanation.summary}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                            {explanation.featureWeights.slice(0, explainabilityTopK).map((feature) => (
                              <Chip
                                key={`${explanation.entityText}-${feature.feature}`}
                                label={`${feature.feature}: ${feature.weight.toFixed(2)}`}
                                color={feature.weight >= 0 ? 'success' : 'error'}
                                variant={Math.abs(feature.weight) < 0.05 ? 'outlined' : 'filled'}
                                size="small"
                              />
                            ))}
                          </Box>
                          {explanation.context && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              Context: {explanation.context}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Run entity extraction to view explainability insights.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Sentiment Analysis Tab */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    💭 Sentiment Analysis Input
                  </Typography>
                  <TextField
                    multiline
                    rows={6}
                    fullWidth
                    placeholder="Enter text to analyze sentiment..."
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAnalyzeSentiment}
                    disabled={loading || !analysisText.trim()}
                    startIcon={<TrendingUpIcon />}
                  >
                    Analyze Sentiment
                  </Button>
                  {loading && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📈 Sentiment Results
                  </Typography>
                  {sentimentResults ? (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`${sentimentResults.sentiment.toUpperCase()} Sentiment`}
                          color={getSentimentColor(sentimentResults.sentiment)}
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`${(sentimentResults.confidence * 100).toFixed(1)}% Confidence`}
                          variant="outlined"
                        />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle2" gutterBottom>
                        Key Sentiment Indicators:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {sentimentResults.keywords.map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Alert severity="info">
                      Enter text above and click "Analyze Sentiment" to see AI sentiment analysis
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Entity Insights Tab */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🧠 Generate AI Insights
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Generate intelligent insights for entities using AI analysis
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleGenerateInsights}
                    disabled={loading}
                    startIcon={<InsightsIcon />}
                  >
                    Generate Demo Insights
                  </Button>
                  {loading && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    💡 AI-Generated Insights
                  </Typography>
                  {insightResults ? (
                    <>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Insights generated for Entity: {insightResults.entityId}
                      </Alert>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Key Insights ({insightResults.insights.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {insightResults.insights.map((insight, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <LightbulbIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText primary={insight} />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>
                            Risk Factors ({insightResults.riskFactors.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {insightResults.riskFactors.map((risk, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>{getSeverityIcon(risk.severity)}</ListItemIcon>
                                <ListItemText primary={risk.factor} secondary={risk.description} />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    </>
                  ) : (
                    <Alert severity="info">
                      Click "Generate Demo Insights" to see AI-powered entity analysis
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Data Quality Tab */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔍 Data Quality Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    AI-powered analysis of graph data quality and improvement suggestions
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleQualityAnalysis}
                    disabled={loading}
                    startIcon={<EnhanceIcon />}
                  >
                    Analyze Data Quality
                  </Button>
                  {loading && <LinearProgress sx={{ mt: 1 }} />}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Quality Assessment
                  </Typography>
                  {qualityResults ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" component="span" color="primary">
                          {qualityResults.overallScore}/10
                        </Typography>
                        <Typography variant="body1" component="span" sx={{ ml: 1 }}>
                          Overall Quality Score
                        </Typography>
                      </Box>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>Quality Issues ({qualityResults.insights.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {qualityResults.insights.map((insight) => (
                              <ListItem key={insight.id}>
                                <ListItemIcon>{getSeverityIcon(insight.severity)}</ListItemIcon>
                                <ListItemText
                                  primary={insight.message}
                                  secondary={insight.suggestions.join('; ')}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>AI Recommendations</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {qualityResults.recommendations.map((rec, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <LightbulbIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText primary={rec} />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    </>
                  ) : (
                    <Alert severity="info">
                      Click "Analyze Data Quality" to see AI-powered quality assessment
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default AIAnalysisPanel;
