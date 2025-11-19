import React, { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Security,
  Warning,
  TrendingUp,
  Psychology,
  Refresh,
  PlayArrow,
  Stop,
} from '@mui/icons-material';
import { analyzeText } from '../../psyops-monitor/detector';

interface BasicAnalysis {
  score: number;
  tags: string[];
}

interface AnalysisResult {
  id: string;
  text: string;
  score: number;
  tags: string[];
  timestamp: Date;
  source: string;
  countermeasures?: string[];
}

interface ThreatMetrics {
  totalAnalyzed: number;
  threatsDetected: number;
  averageScore: number;
  lastUpdate: Date;
}

const EnhancedPsyOpsMonitor: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [metrics, setMetrics] = useState<ThreatMetrics>({
    totalAnalyzed: 0,
    threatsDetected: 0,
    averageScore: 0,
    lastUpdate: new Date(),
  });
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Enhanced analysis function that integrates with backend capabilities
  const performAnalysis = useCallback(
    async (text: string, source: string = 'manual') => {
      if (!text.trim()) return;

      // Use the existing client-side detector
      const basicAnalysis: BasicAnalysis = analyzeText(text);

      // Enhanced analysis with additional checks
      const enhancedScore = calculateEnhancedScore(text, basicAnalysis);
      const countermeasures = generateCountermeasures(
        basicAnalysis.tags,
        enhancedScore,
      );

      const result: AnalysisResult = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        score: enhancedScore,
        tags: basicAnalysis.tags,
        timestamp: new Date(),
        source,
        countermeasures,
      };

      setAnalysisResults((prev) => [result, ...prev.slice(0, 49)]); // Keep last 50 results

      // Update metrics
      setMetrics((prev) => ({
        totalAnalyzed: prev.totalAnalyzed + 1,
        threatsDetected: prev.threatsDetected + (enhancedScore > 0.5 ? 1 : 0),
        averageScore:
          (prev.averageScore * prev.totalAnalyzed + enhancedScore) /
          (prev.totalAnalyzed + 1),
        lastUpdate: new Date(),
      }));

      // If this is a high-risk detection, could trigger backend notification
      if (enhancedScore > 0.7) {
        console.log('High-risk content detected:', {
          score: enhancedScore,
          tags: basicAnalysis.tags,
          text: text.substring(0, 100),
        });
      }
    },
    [],
  );

  // Enhanced scoring that considers additional factors
  const calculateEnhancedScore = (
    text: string,
    basicAnalysis: BasicAnalysis,
  ): number => {
    let score = basicAnalysis.score;

    // Additional scoring factors
    const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
    if (text.length > 0) {
      const upperCaseRatio = uppercaseCount / text.length;
      if (upperCaseRatio > 0.3) score += 0.1;
    }

    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) score += 0.1; // Excessive exclamation

    const urgencyWords = [
      'urgent',
      'immediate',
      'now',
      'hurry',
      'crisis',
      'emergency',
    ];
    if (urgencyWords.some((word) => text.toLowerCase().includes(word))) {
      score += 0.15; // Urgency manipulation
    }

    const repetitionPattern = /(.{3,})\1{2,}/i;
    if (repetitionPattern.test(text)) score += 0.1; // Repetitive content

    return Math.min(1, score);
  };

  // Generate defensive countermeasures based on detected patterns
  const generateCountermeasures = (tags: string[], score: number): string[] => {
    const countermeasures: string[] = [];

    if (tags.includes('bias')) {
      countermeasures.push('Source verification recommended');
      countermeasures.push('Cross-reference with factual sources');
    }

    if (tags.some((tag) => tag.startsWith('emotion:'))) {
      countermeasures.push(
        'Emotional manipulation detected - apply critical thinking',
      );
      countermeasures.push('Consider the emotional intent behind the message');
    }

    if (score > 0.7) {
      countermeasures.push('High-risk content - human review recommended');
      countermeasures.push('Consider content isolation or flagging');
    }

    if (score > 0.5) {
      countermeasures.push('Moderate risk - monitor for patterns');
    }

    return countermeasures;
  };

  // Simulate real-time monitoring
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (realTimeEnabled && isMonitoring) {
      interval = setInterval(() => {
        // Simulate incoming content for monitoring
        const simulatedContent = [
          'Breaking: Urgent action needed on this critical issue!',
          'Everyone knows this is fake news and propaganda!',
          "You should be furious about what they're hiding from you!",
          'The truth is they never tell you the real story.',
          'Normal news content with balanced reporting.',
        ];

        const randomContent =
          simulatedContent[Math.floor(Math.random() * simulatedContent.length)];
        performAnalysis(randomContent, 'real-time');
      }, 5000); // Analyze every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeEnabled, isMonitoring, performAnalysis]);

  const handleManualAnalysis = () => {
    performAnalysis(inputText, 'manual');
    setInputText('');
  };

  const getScoreColor = (
    score: number,
  ): 'error' | 'warning' | 'success' => {
    if (score >= 0.7) return 'error';
    if (score >= 0.4) return 'warning';
    return 'success';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return 'High Risk';
    if (score >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Psychology color="primary" />
        Enhanced PsyOps Monitor
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Defensive Security Tool:</strong> This monitor analyzes content
        for psychological manipulation patterns and provides defensive
        countermeasures. All analysis is for protective purposes only.
      </Alert>

      {/* Control Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monitor Controls
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={isMonitoring}
                    onChange={(e) => setIsMonitoring(e.target.checked)}
                  />
                }
                label="Active Monitoring"
              />
            </Grid>
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={realTimeEnabled}
                    onChange={(e) => setRealTimeEnabled(e.target.checked)}
                  />
                }
                label="Real-Time Simulation"
              />
            </Grid>
            <Grid item>
              <Tooltip title="Refresh analysis results">
                <IconButton onClick={() => setAnalysisResults([])}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Metrics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {metrics.totalAnalyzed}
              </Typography>
              <Typography variant="body2">Total Analyzed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">
                {metrics.threatsDetected}
              </Typography>
              <Typography variant="body2">Threats Detected</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {(metrics.averageScore * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">Avg Risk Score</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {isMonitoring ? 'Active' : 'Inactive'}
              </Typography>
              <Typography variant="body2">Monitor Status</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Analysis Input */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manual Content Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter content to analyze for psychological manipulation patterns..."
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleManualAnalysis}
                disabled={!inputText.trim()}
                sx={{ height: '100%' }}
                startIcon={<Visibility />}
              >
                Analyze Content
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Card>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Security />
            Analysis Results
            <Badge badgeContent={analysisResults.length} color="primary" />
          </Typography>

          {analysisResults.length === 0 ? (
            <Alert severity="info">
              No analysis results yet. Enter content above or enable real-time
              monitoring to begin analysis.
            </Alert>
          ) : (
            <List>
              {analysisResults.map((result, index) => (
                <Accordion key={result.id} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                      }}
                    >
                      <Chip
                        label={getScoreLabel(result.score)}
                        color={getScoreColor(result.score)}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {result.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Risk Assessment
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2">Risk Score:</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={result.score * 100}
                            color={getScoreColor(result.score)}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2">
                            {(result.score * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Detected Patterns
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {result.tags.map((tag, i) => (
                            <Chip
                              key={i}
                              label={tag}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {result.tags.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              No specific patterns detected
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Recommended Countermeasures
                        </Typography>
                        {result.countermeasures &&
                        result.countermeasures.length > 0 ? (
                          <List dense>
                            {result.countermeasures.map((measure, i) => (
                              <ListItem key={i} sx={{ pl: 0 }}>
                                <ListItemText
                                  primary={measure}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No specific countermeasures needed
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnhancedPsyOpsMonitor;
