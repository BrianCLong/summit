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
  Divider,
  LinearProgress,
  Alert,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Link as LinkIcon,
  Sentiment as SentimentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Mock API calls for scaffold - replace with actual API integration
const mockApiCall = (endpoint, params) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (endpoint) {
        case 'sentiment':
          resolve({
            overall_sentiment: 'positive',
            overall_confidence: 0.78,
            field_sentiments: {
              description: { sentiment: 'positive', confidence: 0.82 },
              notes: { sentiment: 'neutral', confidence: 0.65 }
            },
            summary: 'Analyzed 2 text fields. Overall sentiment: positive (confidence: high, 0.78)'
          });
        
        case 'predict-links':
          resolve([
            {
              from: params.entityId,
              to: 'entity_123',
              confidence: 0.87,
              reasoning: 'Strong semantic similarity and co-occurrence patterns',
              type: 'predicted_link'
            },
            {
              from: params.entityId,
              to: 'entity_456',
              confidence: 0.72,
              reasoning: 'Temporal correlation and shared attributes',
              type: 'predicted_link'
            }
          ]);
        
        case 'ai-summary':
          resolve({
            summary: 'This entity shows strong positive sentiment and high engagement patterns. Key relationships suggest central role in organizational network.',
            insights: [
              'High influence score in communication network',
              'Positive sentiment trend over time',
              'Strong correlation with successful outcomes'
            ],
            recommendations: [
              'Consider expanding analysis to connected entities',
              'Monitor for sentiment changes over time',
              'Investigate high-confidence link predictions'
            ]
          });
        
        default:
          resolve({});
      }
    }, 1000 + Math.random() * 1000); // Simulate network delay
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
    switch (sentimentType) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'default';
    }
  };

  const getSentimentIcon = (sentimentType) => {
    switch (sentimentType) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SentimentIcon />
          <Typography variant="h6">Sentiment Analysis</Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Chip
            label={`${sentiment.overall_sentiment} ${getSentimentIcon(sentiment.overall_sentiment)}`}
            color={getSentimentColor(sentiment.overall_sentiment)}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            Confidence: {(sentiment.overall_confidence * 100).toFixed(1)}%
          </Typography>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={sentiment.overall_confidence * 100}
          color={getSentimentColor(sentiment.overall_sentiment)}
          sx={{ mb: 2 }}
        />
        
        <Typography variant="body2" color="text.secondary">
          {sentiment.summary}
        </Typography>
        
        {sentiment.field_sentiments && Object.keys(sentiment.field_sentiments).length > 0 && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Field Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(sentiment.field_sentiments).map(([field, data]) => (
                <Box key={field} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">{field}:</Typography>
                  <Chip
                    size="small"
                    label={`${data.sentiment} (${(data.confidence * 100).toFixed(0)}%)`}
                    color={getSentimentColor(data.sentiment)}
                    variant="outlined"
                  />
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
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
            <ListItem 
              key={index}
              button
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
                      → {prediction.to}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${(prediction.confidence * 100).toFixed(0)}%`}
                      color={prediction.confidence > 0.8 ? 'success' : 'primary'}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {prediction.reasoning}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

const AISummary = ({ summary, loading }) => {
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
                    primary={
                      <Typography variant="body2">{insight}</Typography>
                    }
                  />
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
                    primary={
                      <Typography variant="body2">{rec}</Typography>
                    }
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
  const [sentiment, setSentiment] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState({ sentiment: false, predictions: false, summary: false });
  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  // Load insights when selected entity changes
  useEffect(() => {
    if (selectedEntity) {
      loadAllInsights();
    } else {
      // Clear data when no entity selected
      setSentiment(null);
      setPredictions(null);
      setAiSummary(null);
    }
  }, [selectedEntity]);

  const loadAllInsights = async () => {
    if (!selectedEntity) return;

    setError(null);
    
    // Load sentiment analysis
    setLoading(prev => ({ ...prev, sentiment: true }));
    try {
      const sentimentData = await mockApiCall('sentiment', { 
        entityId: selectedEntity.id,
        entityData: selectedEntity 
      });
      setSentiment(sentimentData);
    } catch (err) {
      console.error('Error loading sentiment:', err);
      setError('Failed to load sentiment analysis');
    } finally {
      setLoading(prev => ({ ...prev, sentiment: false }));
    }

    // Load link predictions
    setLoading(prev => ({ ...prev, predictions: true }));
    try {
      const predictionData = await mockApiCall('predict-links', { 
        entityId: selectedEntity.id 
      });
      setPredictions(predictionData);
    } catch (err) {
      console.error('Error loading predictions:', err);
      setError('Failed to load link predictions');
    } finally {
      setLoading(prev => ({ ...prev, predictions: false }));
    }

    // Load AI summary
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const summaryData = await mockApiCall('ai-summary', { 
        entityId: selectedEntity.id,
        entityData: selectedEntity 
      });
      setAiSummary(summaryData);
    } catch (err) {
      console.error('Error loading AI summary:', err);
      setError('Failed to load AI summary');
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const handleRefresh = () => {
    loadAllInsights();
  };

  const isLoading = Object.values(loading).some(Boolean);

  if (!selectedEntity) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          width: 400, 
          height: '100%', 
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box textAlign="center">
          <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
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
    <Paper elevation={2} sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          <SentimentDisplay 
            sentiment={sentiment} 
            loading={loading.sentiment} 
          />

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