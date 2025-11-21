/**
 * De-escalation Coaching Demo View
 *
 * Displays conversation analysis with coaching guidance for customer service scenarios.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

interface ConversationResult {
  conversation: {
    id: string;
    scenario: string;
    customer_message: string;
    metadata: Record<string, any>;
    ground_truth: {
      escalation_risk: string;
      recommended_approach: string;
    };
  };
  analysis: {
    timestamp: string;
    diagnostic: {
      toxicity: number;
      sentiment: string;
      emotion: string;
      absolutist_score: number;
      caps_ratio: number;
    };
    rewrite: {
      version: string;
      text: string;
    };
    guidance: string[];
    escalation_risk: string;
  };
}

interface DemoResults {
  demo_name: string;
  processed_at: string;
  total_conversations: number;
  risk_distribution: Record<string, number>;
  avg_toxicity: number;
  results: ConversationResult[];
}

export const DeescalationDemo: React.FC = () => {
  const [results, setResults] = useState<DemoResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedConv, setSelectedConv] = useState<ConversationResult | null>(null);

  useEffect(() => {
    loadDemoResults();
  }, []);

  const loadDemoResults = async () => {
    try {
      // In production, this would fetch from API
      const response = await fetch('/demos/deescalation/output/analysis_results.json');
      const data = await response.json();
      setResults(data);
      if (data.results.length > 0) {
        setSelectedConv(data.results[0]);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load demo results. Run: npm run demo:deescalation');
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getToxicityColor = (toxicity: number) => {
    if (toxicity >= 0.7) return 'error';
    if (toxicity >= 0.4) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !results) {
    return <Alert severity="error">{error || 'No results available'}</Alert>;
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          De-escalation Coaching Demo
        </Typography>
        <Typography variant="body2" color="textSecondary">
          AI-powered communication coaching for customer service excellence
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{results.total_conversations}</Typography>
              <Typography variant="body2" color="textSecondary">
                Conversations Analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{results.avg_toxicity.toFixed(2)}</Typography>
              <Typography variant="body2" color="textSecondary">
                Average Toxicity
              </Typography>
              <LinearProgress
                variant="determinate"
                value={results.avg_toxicity * 100}
                color={getToxicityColor(results.avg_toxicity) as any}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Risk Distribution
              </Typography>
              <Stack spacing={1}>
                {Object.entries(results.risk_distribution).map(([risk, count]) => (
                  <Box key={risk} display="flex" justifyContent="space-between">
                    <Chip label={risk} size="small" color={getRiskColor(risk) as any} />
                    <Typography variant="body2">{count}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="Conversation Analysis" />
          <Tab label="Coaching Guidance" />
          <Tab label="Safety & Privacy" />
        </Tabs>

        {/* Conversation Analysis Tab */}
        {selectedTab === 0 && (
          <CardContent>
            <Grid container spacing={2}>
              {/* Conversation List */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Conversations
                </Typography>
                <Stack spacing={1}>
                  {results.results.map((result) => (
                    <Card
                      key={result.conversation.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        bgcolor:
                          selectedConv?.conversation.id === result.conversation.id
                            ? 'action.selected'
                            : 'background.paper',
                      }}
                      onClick={() => setSelectedConv(result)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {result.conversation.id}
                          </Typography>
                          <Chip
                            label={result.analysis.escalation_risk}
                            size="small"
                            color={getRiskColor(result.analysis.escalation_risk) as any}
                          />
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {result.conversation.scenario}
                        </Typography>
                        <Box mt={1}>
                          <LinearProgress
                            variant="determinate"
                            value={result.analysis.diagnostic.toxicity * 100}
                            color={getToxicityColor(result.analysis.diagnostic.toxicity) as any}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption">
                            Toxicity: {result.analysis.diagnostic.toxicity.toFixed(2)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Grid>

              {/* Selected Conversation Details */}
              <Grid item xs={12} md={8}>
                {selectedConv && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {selectedConv.conversation.id}
                    </Typography>

                    {/* Original Message */}
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">Customer Message</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          {selectedConv.conversation.customer_message}
                        </Alert>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Scenario
                            </Typography>
                            <Typography variant="body2">
                              {selectedConv.conversation.scenario}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Escalation Risk
                            </Typography>
                            <Chip
                              label={selectedConv.analysis.escalation_risk}
                              color={getRiskColor(selectedConv.analysis.escalation_risk) as any}
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    {/* Diagnostics */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">Tone Diagnostics</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption">Toxicity</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={selectedConv.analysis.diagnostic.toxicity * 100}
                              color={
                                getToxicityColor(selectedConv.analysis.diagnostic.toxicity) as any
                              }
                            />
                            <Typography variant="body2">
                              {selectedConv.analysis.diagnostic.toxicity.toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption">Absolutist Score</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={selectedConv.analysis.diagnostic.absolutist_score * 100}
                              color="warning"
                            />
                            <Typography variant="body2">
                              {selectedConv.analysis.diagnostic.absolutist_score.toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption">Sentiment</Typography>
                            <Typography variant="body2">
                              {selectedConv.analysis.diagnostic.sentiment}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption">Emotion</Typography>
                            <Typography variant="body2">
                              {selectedConv.analysis.diagnostic.emotion}
                            </Typography>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    {/* Rewrite */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">De-escalated Version</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Alert severity="success">
                          {selectedConv.analysis.rewrite.text}
                        </Alert>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                          This version preserves the core message while reducing emotional charge.
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Coaching Guidance Tab */}
        {selectedTab === 1 && (
          <CardContent>
            {selectedConv && (
              <Box>
                <Alert severity="info" icon={<PsychologyIcon />} sx={{ mb: 2 }}>
                  AI Copilot coaching for this scenario
                </Alert>

                <Typography variant="h6" gutterBottom>
                  Recommended Approach
                </Typography>
                <List>
                  {selectedConv.analysis.guidance.map((item, idx) => (
                    <ListItem key={idx}>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>

                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Available Copilot Prompts
                  </Typography>
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2">Explain Analysis</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Get detailed explanation of emotional dynamics and tone metrics
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2">Suggest Response</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Get specific language coaching for de-escalation
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2">Scenario Guidance</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Get best practices specific to this scenario type
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                </Box>
              </Box>
            )}
          </CardContent>
        )}

        {/* Safety & Privacy Tab */}
        {selectedTab === 2 && (
          <CardContent>
            <Alert severity="success" icon={<SecurityIcon />} sx={{ mb: 3 }}>
              All customer data is PII-redacted before AI processing. Privacy is enforced at
              multiple layers.
            </Alert>

            <Typography variant="h6" gutterBottom>
              Safety Features
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="PII Redaction"
                  secondary="Customer names, emails, phone numbers automatically redacted"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Escalation Triggers"
                  secondary="Automatic flagging for legal threats, self-harm mentions, violence"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Audit Logging"
                  secondary="All AI coaching interactions logged for quality review"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Evidence Grounding"
                  secondary="All coaching advice grounded in linguistic evidence from the message"
                />
              </ListItem>
            </List>

            <Box mt={3}>
              <Typography variant="body2" color="textSecondary">
                See full safety documentation: demos/copilot/SAFETY.md
              </Typography>
            </Box>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default DeescalationDemo;
