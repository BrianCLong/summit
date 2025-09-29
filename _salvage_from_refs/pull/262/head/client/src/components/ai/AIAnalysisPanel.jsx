import React, { useState } from 'react';
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
  Tab
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
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { useLazyQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries and mutations for AI analysis
const EXTRACT_ENTITIES = gql`
  query ExtractEntities($text: String!, $extractRelationships: Boolean, $confidenceThreshold: Float) {
    extractEntities(
      text: $text
      extractRelationships: $extractRelationships
      confidenceThreshold: $confidenceThreshold
    ) {
      entities {
        id
        text
        type
        confidence
        position {
          start
          end
        }
      }
      relationships {
        id
        source
        target
        type
        confidence
      }
    }
  }
`;

const ANALYZE_SENTIMENT = gql`
  query AnalyzeSentiment($text: String!) {
    analyzeSentiment(text: $text) {
      sentiment
      confidence
      keywords
      metadata
    }
  }
`;

const GENERATE_ENTITY_INSIGHTS = gql`
  query GenerateEntityInsights($entityId: ID!, $entityType: String!, $properties: JSON) {
    generateEntityInsights(
      entityId: $entityId
      entityType: $entityType
      properties: $properties
    ) {
      entityId
      insights
      suggestedRelationships {
        type
        reason
        confidence
      }
      riskFactors {
        factor
        severity
        description
      }
      generatedAt
    }
  }
`;

const GET_DATA_QUALITY_INSIGHTS = gql`
  query GetDataQualityInsights($graphId: ID) {
    getDataQualityInsights(graphId: $graphId) {
      graphId
      overallScore
      insights {
        id
        type
        severity
        message
        suggestions
        affectedEntities
      }
      recommendations
      generatedAt
    }
  }
`;

const ENHANCE_ENTITIES_WITH_AI = gql`
  mutation EnhanceEntitiesWithAI($entityIds: [ID!]!, $enhancementTypes: [String!]) {
    enhanceEntitiesWithAI(entityIds: $entityIds, enhancementTypes: $enhancementTypes) {
      enhancements {
        entityId
        enhancements {
          properties
          relationships
          insights
        }
        confidence
        enhancedAt
      }
      totalEntitiesEnhanced
      totalEnhancementsApplied
    }
  }
`;

const AIAnalysisPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [analysisText, setAnalysisText] = useState('');
  const [extractionResults, setExtractionResults] = useState(null);
  const [sentimentResults, setSentimentResults] = useState(null);
  const [insightResults, setInsightResults] = useState(null);
  const [qualityResults, setQualityResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // GraphQL hooks
  const [extractEntities] = useLazyQuery(EXTRACT_ENTITIES, {
    onCompleted: (data) => {
      setExtractionResults(data.extractEntities);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Entity extraction failed:', error);
      setLoading(false);
    }
  });

  const [analyzeSentiment] = useLazyQuery(ANALYZE_SENTIMENT, {
    onCompleted: (data) => {
      setSentimentResults(data.analyzeSentiment);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Sentiment analysis failed:', error);
      setLoading(false);
    }
  });

  const [generateInsights] = useLazyQuery(GENERATE_ENTITY_INSIGHTS, {
    onCompleted: (data) => {
      setInsightResults(data.generateEntityInsights);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Insight generation failed:', error);
      setLoading(false);
    }
  });

  const [getQualityInsights] = useLazyQuery(GET_DATA_QUALITY_INSIGHTS, {
    onCompleted: (data) => {
      setQualityResults(data.getDataQualityInsights);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Quality analysis failed:', error);
      setLoading(false);
    }
  });

  const [enhanceEntities] = useMutation(ENHANCE_ENTITIES_WITH_AI, {
    onCompleted: (data) => {
      console.log('Entities enhanced:', data);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Entity enhancement failed:', error);
      setLoading(false);
    }
  });

  const handleExtractEntities = () => {
    if (!analysisText.trim()) return;
    setLoading(true);
    extractEntities({
      variables: {
        text: analysisText,
        extractRelationships: true,
        confidenceThreshold: 0.7
      }
    });
  };

  const handleAnalyzeSentiment = () => {
    if (!analysisText.trim()) return;
    setLoading(true);
    analyzeSentiment({ variables: { text: analysisText } });
  };

  const handleGenerateInsights = () => {
    setLoading(true);
    generateInsights({
      variables: {
        entityId: 'demo-entity-1',
        entityType: 'PERSON',
        properties: { name: 'Demo User', role: 'Analyst' }
      }
    });
  };

  const handleQualityAnalysis = () => {
    setLoading(true);
    getQualityInsights({ variables: { graphId: 'demo-graph' } });
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <ErrorIcon color="error" />;
      case 'medium': return <WarningIcon color="warning" />;
      default: return <CheckIcon color="success" />;
    }
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
              AI-Powered Analysis Suite
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Advanced entity extraction, sentiment analysis, and intelligent insights
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              icon={<LightbulbIcon />} 
              label="AI Assistant" 
              color="primary" 
              variant="outlined"
            />
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
          <Tab label="Entity Extraction" icon={<SearchIcon />} />
          <Tab label="Sentiment Analysis" icon={<TrendingUpIcon />} />
          <Tab label="Entity Insights" icon={<InsightsIcon />} />
          <Tab label="Data Quality" icon={<EnhanceIcon />} />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Entity Extraction Tab */}
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
                          <Typography>
                            Entities ({extractionResults.entities.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {extractionResults.entities.map((entity) => (
                              <Chip
                                key={entity.id}
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
                            {extractionResults.relationships.map((rel) => (
                              <ListItem key={rel.id}>
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
                      Enter text above and click "Extract" to see AI-powered entity extraction results
                    </Alert>
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
                          <Typography>Risk Factors ({insightResults.riskFactors.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List>
                            {insightResults.riskFactors.map((risk, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  {getSeverityIcon(risk.severity)}
                                </ListItemIcon>
                                <ListItemText
                                  primary={risk.factor}
                                  secondary={risk.description}
                                />
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
                                <ListItemIcon>
                                  {getSeverityIcon(insight.severity)}
                                </ListItemIcon>
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