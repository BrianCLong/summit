/**
 * Adversarial Misinformation Defense Demo View
 *
 * Displays demo results with interactive exploration of detection evidence.
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Policy as PolicyIcon,
} from '@mui/icons-material';

interface DetectionResult {
  post: {
    id: string;
    platform: string;
    text: string;
    timestamp: string;
    author: string;
    engagement: Record<string, number>;
  };
  analysis: {
    timestamp: string;
    is_misinfo: boolean;
    confidence: number;
    detection_results: Record<string, any>;
    evidence: Array<{
      type: string;
      title: string;
      description: string;
      severity: string;
    }>;
  };
}

interface DemoResults {
  demo_name: string;
  processed_at: string;
  total_posts: number;
  misinfo_detected: number;
  legitimate_content: number;
  detection_rate: number;
  results: DetectionResult[];
}

export const MisinfoDefenseDemo: React.FC = () => {
  const [results, setResults] = useState<DemoResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPost, setSelectedPost] = useState<DetectionResult | null>(null);

  useEffect(() => {
    loadDemoResults();
  }, []);

  const loadDemoResults = async () => {
    try {
      // In production, this would fetch from API
      // For demo, we'll simulate loading from the generated JSON
      const response = await fetch('/demos/misinfo-defense/output/analysis_results.json');
      const data = await response.json();
      setResults(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load demo results. Run: npm run demo:misinfo');
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !results) {
    return (
      <Alert severity="error">
        {error || 'No results available'}
      </Alert>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Adversarial Misinformation Defense Demo
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Multi-modal detection across text, images, and video
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">{results.total_posts}</Typography>
              <Typography variant="body2" color="textSecondary">
                Total Posts Analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error">
                {results.misinfo_detected}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Misinfo Detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success">
                {results.legitimate_content}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Legitimate Content
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {(results.detection_rate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Detection Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="Detection Results" />
          <Tab label="Evidence View" />
          <Tab label="Copilot Examples" />
        </Tabs>

        {/* Detection Results Tab */}
        {selectedTab === 0 && (
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Post ID</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell>Content Preview</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Evidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.results.map((result) => (
                  <TableRow
                    key={result.post.id}
                    hover
                    onClick={() => setSelectedPost(result)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{result.post.id}</TableCell>
                    <TableCell>
                      <Chip label={result.post.platform} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap style={{ maxWidth: 300 }}>
                        {result.post.text}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {result.analysis.is_misinfo ? (
                        <Chip
                          icon={<WarningIcon />}
                          label="Misinfo"
                          color="error"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Legitimate"
                          color="success"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`${(result.analysis.confidence * 100).toFixed(1)}% confidence`}>
                        <Box display="flex" alignItems="center">
                          <CircularProgress
                            variant="determinate"
                            value={result.analysis.confidence * 100}
                            size={24}
                          />
                          <Typography variant="caption" ml={1}>
                            {(result.analysis.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={result.analysis.evidence.length} color="primary">
                        <InfoIcon />
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Selected Post Details */}
            {selectedPost && (
              <Box mt={3} p={2} bgcolor="background.default" borderRadius={1}>
                <Typography variant="h6" gutterBottom>
                  {selectedPost.post.id} - Details
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPost.post.text}
                </Typography>

                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Evidence:
                  </Typography>
                  {selectedPost.analysis.evidence.map((ev, idx) => (
                    <Alert
                      key={idx}
                      severity={getSeverityColor(ev.severity) as any}
                      icon={<PolicyIcon />}
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle2">{ev.title}</Typography>
                      <Typography variant="body2">{ev.description}</Typography>
                      <Chip label={ev.type} size="small" sx={{ mt: 1 }} />
                    </Alert>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        )}

        {/* Evidence View Tab */}
        {selectedTab === 1 && (
          <CardContent>
            <Alert severity="info" icon={<PolicyIcon />} sx={{ mb: 2 }}>
              All detection decisions are backed by explicit evidence. Click any post to see details.
            </Alert>
            {/* Additional evidence visualizations could go here */}
            <Typography variant="body2" color="textSecondary">
              Evidence types: text_analysis, deepfake_detection, image_manipulation, narrative_context
            </Typography>
          </CardContent>
        )}

        {/* Copilot Tab */}
        {selectedTab === 2 && (
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Copilot can explain detection reasoning. All responses are evidence-grounded and policy-safe.
            </Alert>
            <Typography variant="body1" gutterBottom>
              Available Copilot Prompts:
            </Typography>
            <Box component="ul">
              <li>
                <strong>Explain Detection:</strong> Why was this content flagged?
              </li>
              <li>
                <strong>Deepfake Analysis:</strong> Technical explanation of video forensics
              </li>
              <li>
                <strong>Fact-Checking Suggestions:</strong> How to verify this content
              </li>
              <li>
                <strong>Narrative Context:</strong> Understanding information spread patterns
              </li>
            </Box>
            <Typography variant="body2" color="textSecondary" mt={2}>
              See: demos/misinfo-defense/copilot/prompts.json
            </Typography>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default MisinfoDefenseDemo;
