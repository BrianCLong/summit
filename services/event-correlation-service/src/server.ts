/**
 * Event Correlation Service
 * Correlates events, detects patterns, and generates alerts
 */

import express from 'express';
import { StreamConsumer, type ConsumerConfig } from '@intelgraph/stream-processing';
import { CEPEngine, type Event, type EventPattern, type CorrelationRule, type Alert } from '@intelgraph/event-processing';
import { PatternMatcher, EventCorrelator, AnomalyDetector } from '@intelgraph/cep-engine';
import { StreamAnalytics, type AnalyticsQuery } from '@intelgraph/real-time-analytics';

const app = express();
app.use(express.json());

// Initialize components
const cepEngine = new CEPEngine();
const patternMatcher = new PatternMatcher();
const eventCorrelator = new EventCorrelator();
const anomalyDetector = new AnomalyDetector();
const streamAnalytics = new StreamAnalytics();

// Store alerts and correlated events
const alerts: Alert[] = [];
const correlatedEvents = new Map<string, Event[]>();

/**
 * API Routes
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'event-correlation-service',
    version: '1.0.0',
  });
});

// Register correlation rule
app.post('/api/correlation/rules', (req, res) => {
  try {
    const rule: CorrelationRule = req.body;
    eventCorrelator.registerCorrelationRule(rule);
    res.json({ status: 'registered', rule: rule.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Register pattern
app.post('/api/patterns', (req, res) => {
  try {
    const pattern: EventPattern = req.body;
    cepEngine.registerPattern(pattern);
    patternMatcher.registerPattern(pattern);
    res.json({ status: 'registered', pattern: pattern.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Register analytics query
app.post('/api/analytics/queries', (req, res) => {
  try {
    const query: AnalyticsQuery = req.body;
    streamAnalytics.registerQuery(query);
    res.json({ status: 'registered', query: query.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get alerts
app.get('/api/alerts', (req, res) => {
  const severity = req.query.severity as Alert['severity'] | undefined;
  const limit = parseInt(req.query.limit as string) || 100;

  let filteredAlerts = alerts;

  if (severity) {
    filteredAlerts = alerts.filter(a => a.severity === severity);
  }

  res.json({
    alerts: filteredAlerts.slice(-limit),
    count: filteredAlerts.length,
  });
});

// Get alert by ID
app.get('/api/alerts/:id', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json(alert);
});

// Get correlated events
app.get('/api/correlation/events', (req, res) => {
  const groups = Array.from(correlatedEvents.entries()).map(([key, events]) => ({
    key,
    count: events.length,
    events: events.slice(-10), // Last 10 events
  }));

  res.json({ groups, total: groups.length });
});

// Process events endpoint (for testing)
app.post('/api/events', async (req, res) => {
  try {
    const event: Event = {
      eventId: `evt-${Date.now()}`,
      eventType: req.body.eventType,
      eventSource: req.body.eventSource || 'api',
      timestamp: Date.now(),
      ...req.body,
      key: null,
      value: JSON.stringify(req.body),
      offset: 0,
      partition: 0,
      topic: 'events',
    };

    await processEvent(event);

    res.json({ status: 'processed', eventId: event.eventId });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  res.json({
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    highAlerts: alerts.filter(a => a.severity === 'high').length,
    correlatedGroups: correlatedEvents.size,
    activeSequences: cepEngine.getActiveSequences().length,
  });
});

/**
 * Event Processing
 */
async function processEvent(event: Event): Promise<void> {
  // Process through CEP engine
  await cepEngine.processEvent(event);

  // Process through analytics
  await streamAnalytics.processEvent(event);

  // Correlate with other events
  const correlated = await eventCorrelator.correlateEvents([event]);

  for (const [key, events] of correlated) {
    correlatedEvents.set(key, events);
  }

  // Detect anomalies
  const anomalies = await anomalyDetector.detectAnomalies([event], 'value');

  if (anomalies.length > 0) {
    console.log(`Detected ${anomalies.length} anomalies`);
  }
}

/**
 * Event Listeners
 */
cepEngine.on('pattern:matched', ({ pattern, sequence }) => {
  console.log(`Pattern matched: ${pattern.name}`);
});

cepEngine.on('alert:generated', (alert: Alert) => {
  console.log(`Alert generated: ${alert.title} [${alert.severity}]`);
  alerts.push(alert);

  // Trim alerts if too many
  if (alerts.length > 10000) {
    alerts.splice(0, alerts.length - 10000);
  }
});

streamAnalytics.on('analytics:result', (result) => {
  console.log(`Analytics result for query ${result.queryId}:`, result.groups.length, 'groups');
});

eventCorrelator.on('events:correlated', ({ rule, events }) => {
  console.log(`Events correlated by rule ${rule.name}:`, events.length);
});

anomalyDetector.on('anomaly:detected', ({ event, zScore, field }) => {
  console.log(`Anomaly detected in ${field}: z-score ${zScore.toFixed(2)}`);
});

/**
 * Start server
 */
async function startServer() {
  try {
    const PORT = parseInt(process.env.PORT || '3001');

    app.listen(PORT, () => {
      console.log(`Event correlation service running on port ${PORT}`);
    });

    // In a real implementation, would connect to message bus and consume events
    console.log('Service ready to process events');
  } catch (error) {
    console.error('Failed to start event correlation service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down event correlation service...');
  process.exit(0);
});

// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, cepEngine, patternMatcher, eventCorrelator, anomalyDetector, streamAnalytics };
