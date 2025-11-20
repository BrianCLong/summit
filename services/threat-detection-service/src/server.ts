/**
 * Threat Detection Service
 *
 * Real-time threat detection, analytics, and alerting service
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import type { Request, Response } from 'express';
import { BehavioralAnomalyDetector } from '@intelgraph/insider-threat';
import { SurveillanceDetector } from '@intelgraph/espionage-detection';
import { InfluenceCampaignDetector } from '@intelgraph/foreign-influence';

const app = express();
app.use(express.json());

// Initialize detectors
const behavioralDetector = new BehavioralAnomalyDetector({
  sensitivityLevel: 'CRITICAL',
  minimumConfidence: 0.8,
  lookbackPeriodDays: 90,
  enableMLModels: true,
  alertThreshold: 60
});

const surveillanceDetector = new SurveillanceDetector();
const influenceDetector = new InfluenceCampaignDetector();

// Threat alert queue
const alertQueue: any[] = [];
const threatMetrics = {
  totalDetections: 0,
  criticalThreats: 0,
  highThreats: 0,
  mediumThreats: 0,
  lowThreats: 0,
  lastUpdate: new Date()
};

// WebSocket for real-time alerts
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('Client connected to threat detection stream');

  // Send initial metrics
  ws.send(JSON.stringify({
    type: 'METRICS',
    data: threatMetrics
  }));

  // Send any queued alerts
  alertQueue.forEach(alert => {
    ws.send(JSON.stringify({
      type: 'ALERT',
      data: alert
    }));
  });
});

// Broadcast alert to all connected clients
function broadcastAlert(alert: any) {
  alertQueue.push(alert);
  if (alertQueue.length > 100) {
    alertQueue.shift(); // Keep only last 100 alerts
  }

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN state
      client.send(JSON.stringify({
        type: 'ALERT',
        data: alert
      }));
    }
  });
}

// Update and broadcast metrics
function updateMetrics(threatLevel: string) {
  threatMetrics.totalDetections++;

  switch (threatLevel) {
    case 'CRITICAL':
      threatMetrics.criticalThreats++;
      break;
    case 'HIGH':
      threatMetrics.highThreats++;
      break;
    case 'MEDIUM':
      threatMetrics.mediumThreats++;
      break;
    case 'LOW':
      threatMetrics.lowThreats++;
      break;
  }

  threatMetrics.lastUpdate = new Date();

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'METRICS',
        data: threatMetrics
      }));
    }
  });
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'threat-detection-service',
    connectedClients: wss.clients.size,
    timestamp: new Date().toISOString()
  });
});

// Real-time threat detection endpoint
app.post('/api/detect/realtime', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    let threats: any[] = [];

    switch (type) {
      case 'BEHAVIORAL':
        threats = await behavioralDetector.detectAnomalies(data.userId, data.activityData);
        break;

      case 'SURVEILLANCE':
        threats = await surveillanceDetector.detectPhysicalSurveillance(data.targetId, data.observationData);
        break;

      case 'INFLUENCE':
        const campaign = await influenceDetector.detectCampaign(data);
        if (campaign) threats = [campaign];
        break;

      default:
        return res.status(400).json({ error: 'Unknown detection type' });
    }

    // Process detected threats
    threats.forEach(threat => {
      const alert = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type,
        severity: threat.severity || threat.threatLevel || 'MEDIUM',
        threat,
        source: req.ip
      };

      broadcastAlert(alert);
      updateMetrics(alert.severity);
    });

    res.json({
      detected: threats.length,
      threats
    });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// Batch threat analysis
app.post('/api/detect/batch', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    const results = {
      analyzed: events.length,
      threats: [] as any[],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const event of events) {
      try {
        const detection = await detectThreat(event);
        if (detection) {
          results.threats.push(detection);

          // Update summary
          const severity = detection.severity || 'MEDIUM';
          results.summary[severity.toLowerCase() as keyof typeof results.summary]++;

          // Broadcast high-severity threats
          if (severity === 'CRITICAL' || severity === 'HIGH') {
            broadcastAlert(detection);
            updateMetrics(severity);
          }
        }
      } catch (err) {
        console.error('Event analysis error:', err);
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Batch analysis failed' });
  }
});

// Get threat analytics
app.get('/api/analytics/summary', (req: Request, res: Response) => {
  res.json({
    metrics: threatMetrics,
    recentAlerts: alertQueue.slice(-20),
    breakdown: {
      byType: calculateThreatsByType(),
      bySeverity: {
        critical: threatMetrics.criticalThreats,
        high: threatMetrics.highThreats,
        medium: threatMetrics.mediumThreats,
        low: threatMetrics.lowThreats
      }
    }
  });
});

// Get threat trends
app.get('/api/analytics/trends', (req: Request, res: Response) => {
  const { period = '24h' } = req.query;

  // Calculate trends based on alert queue
  const now = Date.now();
  const periodMs = parsePeriod(period as string);
  const cutoff = now - periodMs;

  const recentAlerts = alertQueue.filter(alert => {
    const alertTime = new Date(alert.timestamp).getTime();
    return alertTime > cutoff;
  });

  const trends = {
    period,
    totalAlerts: recentAlerts.length,
    averagePerHour: recentAlerts.length / (periodMs / 3600000),
    topThreats: calculateTopThreats(recentAlerts),
    timeline: generateTimeline(recentAlerts, periodMs)
  };

  res.json(trends);
});

// Alert management
app.get('/api/alerts/recent', (req: Request, res: Response) => {
  const { limit = 50 } = req.query;
  const recentAlerts = alertQueue.slice(-(limit as number));
  res.json({ alerts: recentAlerts });
});

app.get('/api/alerts/:id', (req: Request, res: Response) => {
  const alert = alertQueue.find(a => a.id === req.params.id);
  if (alert) {
    res.json({ alert });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// Threat correlation
app.post('/api/correlate', async (req: Request, res: Response) => {
  try {
    const { threatIds } = req.body;
    const threats = alertQueue.filter(a => threatIds.includes(a.id));

    const correlation = {
      threats,
      commonFactors: analyzeCommonFactors(threats),
      timeline: threats.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        type: t.type
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      riskScore: calculateCorrelatedRisk(threats)
    };

    res.json({ correlation });
  } catch (error) {
    res.status(500).json({ error: 'Correlation failed' });
  }
});

// Helper functions

async function detectThreat(event: any): Promise<any> {
  // Implement threat detection logic
  return null;
}

function calculateThreatsByType(): Record<string, number> {
  const byType: Record<string, number> = {};

  alertQueue.forEach(alert => {
    byType[alert.type] = (byType[alert.type] || 0) + 1;
  });

  return byType;
}

function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)([hdwm])$/);
  if (!match) return 86400000; // 24 hours default

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    h: 3600000,
    d: 86400000,
    w: 604800000,
    m: 2592000000
  };

  return value * (multipliers[unit] || 86400000);
}

function calculateTopThreats(alerts: any[]): any[] {
  const threatCounts: Record<string, number> = {};

  alerts.forEach(alert => {
    const key = `${alert.type}:${alert.severity}`;
    threatCounts[key] = (threatCounts[key] || 0) + 1;
  });

  return Object.entries(threatCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([threat, count]) => ({ threat, count }));
}

function generateTimeline(alerts: any[], periodMs: number): any[] {
  const buckets = 24; // 24 time buckets
  const bucketSize = periodMs / buckets;
  const timeline: any[] = Array(buckets).fill(0);

  const now = Date.now();

  alerts.forEach(alert => {
    const alertTime = new Date(alert.timestamp).getTime();
    const timeDiff = now - alertTime;
    const bucketIndex = Math.floor(timeDiff / bucketSize);

    if (bucketIndex >= 0 && bucketIndex < buckets) {
      timeline[buckets - 1 - bucketIndex]++;
    }
  });

  return timeline;
}

function analyzeCommonFactors(threats: any[]): any {
  // Analyze common factors between threats
  return {
    commonTargets: [],
    commonTypes: [],
    temporalClustering: false
  };
}

function calculateCorrelatedRisk(threats: any[]): number {
  // Calculate risk score based on correlated threats
  let score = 0;

  threats.forEach(threat => {
    switch (threat.severity) {
      case 'CRITICAL':
        score += 40;
        break;
      case 'HIGH':
        score += 25;
        break;
      case 'MEDIUM':
        score += 15;
        break;
      case 'LOW':
        score += 5;
        break;
    }
  });

  return Math.min(score, 100);
}

const PORT = process.env.PORT || 3011;
const server = app.listen(PORT, () => {
  console.log(`Threat Detection Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`WebSocket available for real-time alerts`);
});

// Attach WebSocket server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

export default app;
