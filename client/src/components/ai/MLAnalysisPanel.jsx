import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  Psychology,
  TrendingUp,
  Warning,
  NetworkCheck,
  Analytics,
  AutoAwesome,
  Security,
  BugReport,
  Timeline,
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries for AI/ML analysis
const ML_RISK_ANALYSIS = gql`
  query GetMLRiskAnalysis($entityId: ID!) {
    calculateRiskScore(entityId: $entityId) {
      confidence
      probability
      risk_level
      reasoning
    }
  }
`;

const ML_BEHAVIORAL_PATTERNS = gql`
  query GetBehavioralPatterns($entityId: ID!) {
    analyzeBehavioralPatterns(entityId: $entityId) {
      behavioral_score
      pattern_stability
      patterns {
        pattern_type
        description
        confidence
        frequency
        time_window
      }
    }
  }
`;

const ML_GRAPH_METRICS = gql`
  query GetGraphMetrics($investigationId: ID!) {
    analyzeGraphMetrics(investigationId: $investigationId) {
      clustering_coefficient
      average_path_length
      network_density
      community_modularity
      centrality_scores
      influence_scores
    }
  }
`;

const ML_ANOMALY_DETECTION = gql`
  query GetAnomalies($investigationId: ID!) {
    detectAnomalies(investigationId: $investigationId) {
      entity_id
      anomaly_type
      severity
      description
      baseline_deviation
      contributing_factors
      timestamp
    }
  }
`;

const MLAnalysisPanel = ({ investigationId = 'inv-001', entityId = '1' }) => {
  const [expandedSection, setExpandedSection] = useState('risk');

  const {
    data: riskData,
    loading: riskLoading,
    error: riskError,
  } = useQuery(ML_RISK_ANALYSIS, {
    variables: { entityId },
    pollInterval: 300000, // Refresh every 5 minutes
    errorPolicy: 'all',
  });

  const {
    data: behavioralData,
    loading: behavioralLoading,
    error: behavioralError,
  } = useQuery(ML_BEHAVIORAL_PATTERNS, {
    variables: { entityId },
    pollInterval: 600000, // Refresh every 10 minutes
    errorPolicy: 'all',
  });

  const {
    data: graphData,
    loading: graphLoading,
    error: graphError,
  } = useQuery(ML_GRAPH_METRICS, {
    variables: { investigationId },
    pollInterval: 900000, // Refresh every 15 minutes
    errorPolicy: 'all',
  });

  const {
    data: anomalyData,
    loading: anomalyLoading,
    error: anomalyError,
  } = useQuery(ML_ANOMALY_DETECTION, {
    variables: { investigationId },
    pollInterval: 180000, // Refresh every 3 minutes
    errorPolicy: 'all',
  });

  const handleAccordionChange = (section) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? section : false);
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPatternTypeIcon = (patternType) => {
    switch (patternType) {
      case 'RECONNAISSANCE_BURST':
        return <NetworkCheck />;
      case 'CREDENTIAL_ACCESS_SEQUENCE':
        return <Security />;
      case 'LATERAL_MOVEMENT_PATTERN':
        return <TrendingUp />;
      default:
        return <Analytics />;
    }
  };

  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const formatScore = (score) => {
    return score ? score.toFixed(3) : '0.000';
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AutoAwesome color="primary" />
            🧠 AI/ML Intelligence Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advanced machine learning insights for investigation {investigationId}, entity{' '}
            {entityId}
          </Typography>
        </CardContent>
      </Card>

      {/* Risk Assessment Section */}
      <Accordion expanded={expandedSection === 'risk'} onChange={handleAccordionChange('risk')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Security color="error" />
            <Typography variant="h6">ML Risk Assessment</Typography>
            {riskLoading && <CircularProgress size={20} />}
            {riskData?.calculateRiskScore && (
              <Chip
                label={riskData.calculateRiskScore.risk_level}
                color={getRiskColor(riskData.calculateRiskScore.risk_level)}
                size="small"
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {riskError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load risk analysis: {riskError.message}
            </Alert>
          )}
          {riskData?.calculateRiskScore && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Risk Probability
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={riskData.calculateRiskScore.probability * 100}
                      color={getRiskColor(riskData.calculateRiskScore.risk_level)}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body1" fontWeight="bold">
                      {formatConfidence(riskData.calculateRiskScore.probability)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Confidence Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={riskData.calculateRiskScore.confidence * 100}
                      color="success"
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body1" fontWeight="bold">
                      {formatConfidence(riskData.calculateRiskScore.confidence)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  ML Reasoning:
                </Typography>
                <List dense>
                  {riskData.calculateRiskScore.reasoning.map((reason, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Psychology color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={reason} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Behavioral Patterns Section */}
      <Accordion
        expanded={expandedSection === 'behavioral'}
        onChange={handleAccordionChange('behavioral')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Timeline color="info" />
            <Typography variant="h6">Behavioral Pattern Analysis</Typography>
            {behavioralLoading && <CircularProgress size={20} />}
            {behavioralData?.analyzeBehavioralPatterns && (
              <Chip
                label={`${Math.round(behavioralData.analyzeBehavioralPatterns.behavioral_score * 100)}% Score`}
                color="info"
                size="small"
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {behavioralError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load behavioral analysis: {behavioralError.message}
            </Alert>
          )}
          {behavioralData?.analyzeBehavioralPatterns && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Behavioral Score</Typography>
                  <Typography variant="h4" color="primary">
                    {formatScore(behavioralData.analyzeBehavioralPatterns.behavioral_score)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Pattern Stability</Typography>
                  <Typography variant="h4" color="success.main">
                    {formatConfidence(behavioralData.analyzeBehavioralPatterns.pattern_stability)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Detected Patterns:
                </Typography>
                {behavioralData.analyzeBehavioralPatterns.patterns.map((pattern, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getPatternTypeIcon(pattern.pattern_type)}
                        <Typography variant="subtitle1">
                          {pattern.pattern_type.replace(/_/g, ' ')}
                        </Typography>
                        <Chip
                          label={formatConfidence(pattern.confidence)}
                          size="small"
                          color="primary"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {pattern.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={`Frequency: ${formatConfidence(pattern.frequency)}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Window: ${pattern.time_window}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Graph Network Analysis Section */}
      <Accordion
        expanded={expandedSection === 'network'}
        onChange={handleAccordionChange('network')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <NetworkCheck color="success" />
            <Typography variant="h6">Network Graph Analysis</Typography>
            {graphLoading && <CircularProgress size={20} />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {graphError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load graph analysis: {graphError.message}
            </Alert>
          )}
          {graphData?.analyzeGraphMetrics && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Tooltip title="Measure of how nodes cluster together">
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Clustering Coefficient</Typography>
                    <Typography variant="h5" color="primary">
                      {formatScore(graphData.analyzeGraphMetrics.clustering_coefficient)}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Tooltip title="Average steps between any two nodes">
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Avg Path Length</Typography>
                    <Typography variant="h5" color="secondary">
                      {formatScore(graphData.analyzeGraphMetrics.average_path_length)}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Tooltip title="Ratio of edges to possible edges">
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Network Density</Typography>
                    <Typography variant="h5" color="info.main">
                      {formatScore(graphData.analyzeGraphMetrics.network_density)}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Tooltip title="Community structure strength">
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption">Modularity</Typography>
                    <Typography variant="h5" color="success.main">
                      {formatScore(graphData.analyzeGraphMetrics.community_modularity)}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Anomaly Detection Section */}
      <Accordion
        expanded={expandedSection === 'anomalies'}
        onChange={handleAccordionChange('anomalies')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <BugReport color="warning" />
            <Typography variant="h6">Anomaly Detection</Typography>
            {anomalyLoading && <CircularProgress size={20} />}
            {anomalyData?.detectAnomalies && (
              <Chip
                label={`${anomalyData.detectAnomalies.length} anomalies`}
                color={anomalyData.detectAnomalies.length > 0 ? 'warning' : 'success'}
                size="small"
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {anomalyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load anomaly detection: {anomalyError.message}
            </Alert>
          )}
          {anomalyData?.detectAnomalies?.length === 0 && (
            <Alert severity="success">No anomalies detected in the current investigation.</Alert>
          )}
          {anomalyData?.detectAnomalies?.map((anomaly, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Warning color="warning" />
                  <Typography variant="h6">
                    {anomaly.anomaly_type.replace(/_/g, ' ')} Anomaly
                  </Typography>
                  <Chip
                    label={`Severity: ${Math.round(anomaly.severity * 100)}%`}
                    color="warning"
                    size="small"
                  />
                </Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {anomaly.description}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Entity: {anomaly.entity_id} | Deviation: {anomaly.baseline_deviation}σ
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Contributing Factors:
                </Typography>
                <List dense>
                  {anomaly.contributing_factors.map((factor, factorIndex) => (
                    <ListItem key={factorIndex}>
                      <ListItemText primary={factor} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default MLAnalysisPanel;
