/**
 * InsightPanel - AI-powered insights and recommendations for entities
 * Displays sentiment analysis, link predictions, and AI-generated summaries
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  LinearProgress,
  Alert,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Link as LinkIcon,
  SentimentSatisfiedAlt as SentimentSatisfiedAltIcon, // Changed from Sentiment
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, gql } from '@apollo/client';

// GraphQL Queries (same as in GraphExplorer.jsx)
const PREDICT_LINKS_QUERY = gql`
  query PredictLinks($entityIds: [ID!]!, $contextText: String) {
    predictLinks(entityIds: $entityIds, contextText: $contextText) {
      sourceId
      targetId
      predictedType
      confidence
      explanation
    }
  }
`;

const ANALYZE_SENTIMENT_QUERY = gql`
  query AnalyzeSentiment($text: String!) {
    analyzeSentiment(text: $text) {
      sentiment
      confidence
      keywords
    }
  }
`;

// Mock API calls for scaffold - replace with actual API integration
const mockApiCall = (endpoint, params) => {
  return new Promise((resolve) => {
    setTimeout(
      () => {
        switch (endpoint) {
          case 'sentiment':
            resolve({
              overall_sentiment: 'positive',
              overall_confidence: 0.78,
              field_sentiments: {
                description: { sentiment: 'positive', confidence: 0.82 },
                notes: { sentiment: 'neutral', confidence: 0.65 },
              },
              summary:
                'Analyzed 2 text fields. Overall sentiment: positive (confidence: high, 0.78)',
            });

          case 'predict-links':
            resolve([
              {
                from: params.entityId,
                to: 'entity_123',
                confidence: 0.87,
                reasoning:
                  'Strong semantic similarity and co-occurrence patterns',
                type: 'predicted_link',
              },
              {
                from: params.entityId,
                to: 'entity_456',
                confidence: 0.72,
                reasoning: 'Temporal correlation and shared attributes',
                type: 'predicted_link',
              },
            ]);

          case 'ai-summary':
            resolve({
              summary:
                'This entity shows strong positive sentiment and high engagement patterns. Key relationships suggest central role in organizational network.',
              insights: [
                'High influence score in communication network',
                'Positive sentiment trend over time',
                'Strong correlation with successful outcomes',
              ],
              recommendations: [
                'Consider expanding analysis to connected entities',
                'Monitor for sentiment changes over time',
                'Investigate high-confidence link predictions',
              ],
            });

          default:
            resolve({});
        }
      },
      1000 + Math.random() * 1000,
    ); // Simulate network delay
  });
};

const SentimentDisplay = ({ sentiment, loading }) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={100} />;
  }

  if (!sentiment) {
    return (
      <Alert severity="info" variant="outlined">
        No sentiment data available
      </Alert>
    );
  }

  const getSentimentColor = (sentimentType) => {
    switch (sentimentType.toLowerCase()) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSentimentIcon = (sentimentType) => {
    switch (sentimentType.toLowerCase()) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SentimentSatisfiedAltIcon />
          <Typography variant="h6">Sentiment Analysis</Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Chip
            label={`${sentiment.sentiment} ${getSentimentIcon(sentiment.sentiment)}`}
            color={getSentimentColor(sentiment.sentiment)}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            Confidence: {(sentiment.confidence * 100).toFixed(1)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={sentiment.confidence * 100}
          color={getSentimentColor(sentiment.sentiment)}
          sx={{ mb: 2 }}
        />

        {/* Display keywords if available */}
        {sentiment.keywords && sentiment.keywords.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Keywords:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {sentiment.keywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* The original mock had field_sentiments, but the GraphQL schema doesn't return it.
            If needed, the GraphQL schema/resolver would need to be extended to return this.
            For now, we'll display a general summary or explanation if available. */}
        {sentiment.explanation && (
          <Typography variant="body2" color="text.secondary">
            Explanation: {sentiment.explanation}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const LinkPredictions = ({ predictions, loading, onLinkSelect }) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={150} />;
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        No link predictions available
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <LinkIcon />
          <Typography variant="h6">Predicted Links</Typography>
        </Box>

        <List dense>
          {predictions.map((prediction, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton
                onClick={() => onLinkSelect && onLinkSelect(prediction)}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
              >
                <ListItemIcon>
                  <TrendingUpIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {prediction.sourceId} → {prediction.targetId}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${(prediction.confidence * 100).toFixed(0)}%`}
                        color={
                          prediction.confidence > 0.8 ? 'success' : 'primary'
                        }
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Type: {prediction.predictedType} - {prediction.explanation}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

const AISummary = ({ summary, loading, onFeedback }) => {
  if (loading) {
    return <Skeleton variant="rectangular" height={200} />;
  }

  if (!summary) {
    return (
      <Alert severity="info" variant="outlined">
        No AI summary available
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <PsychologyIcon />
          <Typography variant="h6">AI Insights</Typography>
        </Box>

        <Typography variant="body2" paragraph>
          {summary.summary}
        </Typography>

        {summary.insights && summary.insights.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Key Insights:
            </Typography>
            <List dense>
              {summary.insights.map((insight, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <InfoIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{insight}</Typography>}
                  />
                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onFeedback(insight, 'accept', summary)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => onFeedback(insight, 'reject', summary)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => onFeedback(insight, 'flag', summary)}
                    >
                      Flag
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {summary.recommendations && summary.recommendations.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Recommendations:
            </Typography>
            <List dense>
              {summary.recommendations.map((rec, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{rec}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const InsightPanel = ({ selectedEntity, onClose, onLinkSelect }) => {
  const dispatch = useDispatch();

  // GraphQL Queries for sentiment and link predictions
  const {
    data: sentimentQueryData,
    loading: loadingSentiment,
    error: errorSentiment,
  } = useQuery(ANALYZE_SENTIMENT_QUERY, {
    variables: {
      text:
        selectedEntity?.description ||
        selectedEntity?.notes ||
        selectedEntity?.name ||
        selectedEntity?.id ||
        '',
    },
    skip: !selectedEntity,
    fetchPolicy: 'cache-and-network', // Always try to get the latest data
  });

  const {
    data: predictLinksQueryData,
    loading: loadingPredictions,
    error: errorPredictions,
  } = useQuery(PREDICT_LINKS_QUERY, {
    variables: { entityIds: selectedEntity ? [selectedEntity.id] : [] },
    skip: !selectedEntity,
    fetchPolicy: 'cache-and-network',
  });

  const sentiment = sentimentQueryData?.analyzeSentiment;
  const predictions = predictLinksQueryData?.predictLinks;

  // Mock AI Summary for now, as it's not part of the current GraphQL task
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);

  useEffect(() => {
    if (selectedEntity) {
      // Simulate AI Summary loading
      setLoadingSummary(true);
      mockApiCall('ai-summary', {
        entityId: selectedEntity.id,
        entityData: selectedEntity,
      })
        .then((data) => setAiSummary(data))
        .catch((err) => {
          console.error('Error loading AI summary:', err);
          setErrorSummary('Failed to load AI summary');
        })
        .finally(() => setLoadingSummary(false));
    } else {
      setAiSummary(null);
      setErrorSummary(null);
    }
  }, [selectedEntity]);

  const isLoading = loadingSentiment || loadingPredictions || loadingSummary;
  const error = errorSentiment || errorPredictions || errorSummary;

  const handleFeedback = async (insight, feedbackType, originalPrediction) => {
    console.log('Feedback received:', {
      insight,
      feedbackType,
      user: 'current_user',
      timestamp: new Date().toISOString(),
      originalPrediction,
    });
    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insight,
          feedbackType,
          user: 'test_user', // Replace with actual user ID
          timestamp: new Date().toISOString(),
          originalPrediction: {
            type: 'ai_summary', // Indicate the type of AI insight
            model: originalPrediction.metadata.model,
            generatedAt: originalPrediction.metadata.generatedAt,
            entityId: selectedEntity.id, // Add entity ID for context
            // You might want to include more details from originalPrediction here
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Feedback API response:', result);
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const handleRefresh = () => {
    loadAllInsights();
  };

  const isLoading = Object.values(loading).some(Boolean);

  if (!selectedEntity) {
    return (
      <Paper
        tabIndex={0}
        aria-label="Insight Panel"
        elevation={2}
        sx={{
          width: 400,
          height: '100%',
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box textAlign="center">
          <PsychologyIcon
            sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            AI Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select an entity to view AI-powered insights and recommendations
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      tabIndex={0}
      aria-label="AI Insights Panel"
      elevation={2}
      sx={{
        width: 400,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PsychologyIcon color="primary" />
            <Typography variant="h6">AI Insights</Typography>
          </Box>
          <Box>
            <Tooltip title="Refresh insights">
              <IconButton
                onClick={handleRefresh}
                disabled={isLoading}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {onClose && (
              <Tooltip title="Close panel">
                <IconButton onClick={onClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {selectedEntity.name || selectedEntity.id}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" flexDirection="column" gap={2}>
          {/* Sentiment Analysis */}
          <SentimentDisplay sentiment={sentiment} loading={loading.sentiment} />

          {/* Link Predictions */}
          <LinkPredictions
            predictions={predictions}
            loading={loading.predictions}
            onLinkSelect={onLinkSelect}
          />

          {/* AI Summary */}
          <AISummary
            summary={aiSummary}
            loading={loading.summary}
            onFeedback={handleFeedback}
          />
        </Box>
      </Box>

      {/* Footer */}
      {isLoading && (
        <Box sx={{ p: 1 }}>
          <LinearProgress />
        </Box>
      )}
    </Paper>
  );
};

export default InsightPanel;
