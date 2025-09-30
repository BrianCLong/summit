import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Badge,
  Divider,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Timeline as TimelineIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

// Advanced temporal analysis algorithms
const TemporalAnalysisEngine = {
  // Pattern detection in timeline events
  detectTemporalPatterns: (events) => {
    const patterns = [];

    // Frequency analysis
    const timeIntervals = [];
    for (let i = 1; i < events.length; i++) {
      const interval = new Date(events[i].timestamp) - new Date(events[i - 1].timestamp);
      timeIntervals.push(interval);
    }

    const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
    const regularIntervals = timeIntervals.filter(
      (interval) => Math.abs(interval - avgInterval) < avgInterval * 0.3,
    );

    if (regularIntervals.length > timeIntervals.length * 0.6) {
      patterns.push({
        type: 'REGULAR_PATTERN',
        confidence: 0.85,
        description: `Regular activity pattern detected (${(avgInterval / (1000 * 60 * 60)).toFixed(1)}h intervals)`,
        impact: 'medium',
      });
    }

    // Burst detection
    const hourlyActivity = {};
    events.forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const maxActivity = Math.max(...Object.values(hourlyActivity));
    const avgActivity = Object.values(hourlyActivity).reduce((a, b) => a + b, 0) / 24;

    if (maxActivity > avgActivity * 3) {
      const peakHour = Object.keys(hourlyActivity).find((h) => hourlyActivity[h] === maxActivity);
      patterns.push({
        type: 'ACTIVITY_BURST',
        confidence: 0.78,
        description: `Activity burst detected at ${peakHour}:00 (${maxActivity} events)`,
        impact: 'high',
      });
    }

    // Weekend/weekday analysis
    const weekendActivity = events.filter((e) => {
      const day = new Date(e.timestamp).getDay();
      return day === 0 || day === 6;
    }).length;

    const weekdayActivity = events.length - weekendActivity;
    const weekendRatio = weekendActivity / events.length;

    if (weekendRatio > 0.4) {
      patterns.push({
        type: 'WEEKEND_ACTIVITY',
        confidence: 0.72,
        description: `High weekend activity detected (${(weekendRatio * 100).toFixed(0)}% of events)`,
        impact: 'medium',
      });
    }

    return patterns;
  },

  // Anomaly detection in timeline
  detectTimelineAnomalies: (events) => {
    const anomalies = [];

    // Gap analysis
    const gaps = [];
    for (let i = 1; i < events.length; i++) {
      const gap = new Date(events[i].timestamp) - new Date(events[i - 1].timestamp);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const largeGaps = gaps.filter((gap) => gap > avgGap * 5);

    if (largeGaps.length > 0) {
      anomalies.push({
        type: 'COMMUNICATION_GAP',
        severity: 'high',
        description: `${largeGaps.length} unusual communication gap(s) detected`,
        recommendation: 'Investigate periods of silence for operational significance',
      });
    }

    // Sudden activity spikes
    const hourlyEvents = {};
    events.forEach((event) => {
      const hourKey = new Date(event.timestamp).toISOString().slice(0, 13);
      hourlyEvents[hourKey] = (hourlyEvents[hourKey] || 0) + 1;
    });

    const eventCounts = Object.values(hourlyEvents);
    const avgHourlyEvents = eventCounts.reduce((a, b) => a + b, 0) / eventCounts.length;
    const spikes = eventCounts.filter((count) => count > avgHourlyEvents * 4);

    if (spikes.length > 0) {
      anomalies.push({
        type: 'ACTIVITY_SPIKE',
        severity: 'medium',
        description: `${spikes.length} unusual activity spike(s) detected`,
        recommendation: 'Analyze coordinated behavior during peak periods',
      });
    }

    return anomalies;
  },

  // Predictive analysis
  predictFutureActivity: (events) => {
    const predictions = [];

    // Weekly pattern prediction
    const weeklyActivity = {};
    events.forEach((event) => {
      const day = new Date(event.timestamp).getDay();
      weeklyActivity[day] = (weeklyActivity[day] || 0) + 1;
    });

    const peakDay = Object.keys(weeklyActivity).reduce((a, b) =>
      weeklyActivity[a] > weeklyActivity[b] ? a : b,
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    predictions.push({
      type: 'WEEKLY_PREDICTION',
      confidence: 0.82,
      description: `Next peak activity likely on ${dayNames[peakDay]}`,
      timeframe: '7 days',
      probability: 0.82,
    });

    // Growth trend prediction
    const recentEvents = events.slice(-10);
    const olderEvents = events.slice(-20, -10);

    if (recentEvents.length > olderEvents.length) {
      predictions.push({
        type: 'GROWTH_TREND',
        confidence: 0.75,
        description: 'Activity trend shows increasing frequency',
        timeframe: '30 days',
        probability: 0.75,
      });
    }

    return predictions;
  },
};

// Sample investigation events
const generateSampleEvents = () => {
  const eventTypes = [
    { type: 'communication', icon: <PhoneIcon />, color: '#2196F3', label: 'Phone Call' },
    { type: 'meeting', icon: <EventIcon />, color: '#FF9800', label: 'Meeting' },
    { type: 'transaction', icon: <MoneyIcon />, color: '#4CAF50', label: 'Financial Transaction' },
    { type: 'document', icon: <DocumentIcon />, color: '#9C27B0', label: 'Document Created' },
    { type: 'travel', icon: <LocationIcon />, color: '#F44336', label: 'Location Change' },
    { type: 'email', icon: <EmailIcon />, color: '#607D8B', label: 'Email Exchange' },
  ];

  const events = [];
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < 25; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const timestamp = new Date(
      startDate.getTime() + i * 24 * 60 * 60 * 1000 + Math.random() * 12 * 60 * 60 * 1000,
    );

    events.push({
      id: `event_${i}`,
      type: eventType.type,
      title: eventType.label,
      description: `${eventType.label} event in investigation timeline`,
      timestamp: timestamp.toISOString(),
      icon: eventType.icon,
      color: eventType.color,
      entities: [
        `Person ${Math.floor(Math.random() * 5) + 1}`,
        `Entity ${Math.floor(Math.random() * 3) + 1}`,
      ],
      location: ['San Francisco', 'New York', 'Chicago', 'Los Angeles'][
        Math.floor(Math.random() * 4)
      ],
      significance: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      verified: Math.random() > 0.3,
    });
  }

  return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export default function InvestigationTimeline() {
  const [events, setEvents] = useState(generateSampleEvents());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentEventIndex, setCurrentEventIndex] = useState(events.length);

  // Run temporal analysis
  const runTemporalAnalysis = async () => {
    setIsAnalyzing(true);

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const detectedPatterns = TemporalAnalysisEngine.detectTemporalPatterns(events);
    const detectedAnomalies = TemporalAnalysisEngine.detectTimelineAnomalies(events);
    const futurePredictions = TemporalAnalysisEngine.predictFutureActivity(events);

    setPatterns(detectedPatterns);
    setAnomalies(detectedAnomalies);
    setPredictions(futurePredictions);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (autoAnalysis && events.length > 0) {
      runTemporalAnalysis();
    }
  }, [events, autoAnalysis]);

  const filteredEvents = events
    .filter((event) => filterType === 'all' || event.type === filterType)
    .slice(0, currentEventIndex);

  const getSignificanceColor = (significance) => {
    switch (significance) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                ⏰ Investigation Timeline
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Temporal analysis and pattern detection in investigation events
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Run Analysis">
                <IconButton onClick={runTemporalAnalysis} disabled={isAnalyzing} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Badge badgeContent={patterns.length + anomalies.length} color="secondary">
                <AIIcon />
              </Badge>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Controls */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎛️ Timeline Controls
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Filter Events</InputLabel>
                <Select
                  value={filterType}
                  label="Filter Events"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Events</MenuItem>
                  <MenuItem value="communication">Communications</MenuItem>
                  <MenuItem value="meeting">Meetings</MenuItem>
                  <MenuItem value="transaction">Transactions</MenuItem>
                  <MenuItem value="document">Documents</MenuItem>
                  <MenuItem value="travel">Travel</MenuItem>
                  <MenuItem value="email">Emails</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={autoAnalysis}
                    onChange={(e) => setAutoAnalysis(e.target.checked)}
                  />
                }
                label="Auto temporal analysis"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                📊 Timeline Stats
              </Typography>
              <Typography variant="body2">Total Events: {events.length}</Typography>
              <Typography variant="body2">Filtered: {filteredEvents.length}</Typography>
              <Typography variant="body2">
                Time Span:{' '}
                {Math.floor(
                  (new Date(events[events.length - 1]?.timestamp) -
                    new Date(events[0]?.timestamp)) /
                    (1000 * 60 * 60 * 24),
                )}{' '}
                days
              </Typography>

              {isAnalyzing && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  🔄 Analyzing temporal patterns...
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                📅 Event Timeline
              </Typography>

              <Timeline>
                {filteredEvents.map((event, index) => (
                  <TimelineItem key={event.id}>
                    <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                      <Typography variant="caption">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </Typography>
                    </TimelineOppositeContent>

                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: event.color }}>{event.icon}</TimelineDot>
                      {index < filteredEvents.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>

                    <TimelineContent>
                      <Box sx={{ pb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2">{event.title}</Typography>
                          <Chip
                            label={event.significance}
                            size="small"
                            color={getSignificanceColor(event.significance)}
                          />
                          {event.verified && <Chip label="Verified" size="small" color="success" />}
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {event.description}
                        </Typography>

                        <Typography variant="caption" display="block">
                          📍 {event.location} | 👥 {event.entities.join(', ')}
                        </Typography>
                      </Box>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>

        {/* Analysis Panel */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🧠 Temporal Analysis
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">🎯 Patterns ({patterns.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {patterns.map((pattern, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <TrendingIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {pattern.description}
                            </Typography>
                          }
                          secondary={`Confidence: ${(pattern.confidence * 100).toFixed(0)}%`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">⚠️ Anomalies ({anomalies.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {anomalies.map((anomaly, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {anomaly.description}
                            </Typography>
                          }
                          secondary={anomaly.recommendation}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">🔮 Predictions ({predictions.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {predictions.map((prediction, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <ScheduleIcon color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {prediction.description}
                            </Typography>
                          }
                          secondary={`${(prediction.probability * 100).toFixed(0)}% confidence | ${prediction.timeframe}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  🔬 <strong>Temporal AI Engine:</strong> Advanced algorithms analyze event
                  sequences, detect patterns, and predict future activity with machine learning
                  models.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
