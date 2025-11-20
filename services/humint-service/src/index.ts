import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { HumintManager } from '@intelgraph/humint-manager';

const app = express();
const port = process.env.HUMINT_SERVICE_PORT || 3100;

// Initialize HUMINT Manager
const humintManager = new HumintManager({
  enableSecurityMonitoring: true,
  enableAutomatedThreatDetection: true,
  requirePolygraph: false,
  maxSourcesPerHandler: 15,
  requireCompartmentation: true
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'humint-service' });
});

// Dashboard endpoint
app.get('/api/dashboard', (req, res) => {
  try {
    const dashboard = humintManager.getDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate dashboard' });
  }
});

// Statistics endpoint
app.get('/api/statistics', (req, res) => {
  try {
    const stats = humintManager.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Source endpoints
app.get('/api/sources', (req, res) => {
  try {
    const sources = humintManager.getSourceDatabase().getAllSources();
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

app.get('/api/sources/:id', (req, res) => {
  try {
    const source = humintManager.getSourceDatabase().getSource(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get source' });
  }
});

app.post('/api/sources', async (req, res) => {
  try {
    const result = await humintManager.recruitSource(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Meeting endpoints
app.get('/api/meetings', (req, res) => {
  try {
    const meetings = humintManager.getHandlerTools().getAllMeetings();
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

app.get('/api/meetings/upcoming', (req, res) => {
  try {
    const { handlerId } = req.query;
    const meetings = humintManager.getHandlerTools().getUpcomingMeetings(
      handlerId as string | undefined
    );
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upcoming meetings' });
  }
});

app.post('/api/meetings', async (req, res) => {
  try {
    const result = await humintManager.conductMeeting(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/meetings/:meetingId/complete', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const result = await humintManager.completeMeeting(
      meetingId,
      req.body.debriefSessionId,
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Intelligence report endpoints
app.get('/api/reports', (req, res) => {
  try {
    const reports = humintManager.getDebriefSystem().getAllReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

app.get('/api/reports/:id', (req, res) => {
  try {
    const report = humintManager.getDebriefSystem().getIntelligenceReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Security incident endpoints
app.get('/api/security/incidents', (req, res) => {
  try {
    const { severity, status, unresolved } = req.query;
    const incidents = humintManager.getOpsecMonitor().getIncidents({
      severity: severity as any,
      status: status as any,
      unresolved: unresolved === 'true'
    });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get incidents' });
  }
});

app.post('/api/security/incidents', (req, res) => {
  try {
    const incident = humintManager.getOpsecMonitor().reportIncident(req.body);
    res.status(201).json(incident);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Threat assessment endpoints
app.get('/api/security/threats/:entityId', (req, res) => {
  try {
    const assessments = humintManager.getOpsecMonitor().getThreatAssessments(req.params.entityId);
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get threat assessments' });
  }
});

app.post('/api/security/threats', (req, res) => {
  try {
    const { entityId, entityType, assessedBy } = req.body;
    const assessment = humintManager.getOpsecMonitor().assessThreat(
      entityId,
      entityType,
      assessedBy
    );
    res.status(201).json(assessment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Secure communications endpoints
app.get('/api/comms/messages', (req, res) => {
  try {
    const { userId, unreadOnly } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const messages = humintManager.getSecureComms().getUserMessages(
      userId as string,
      unreadOnly === 'true'
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/api/comms/messages', (req, res) => {
  try {
    const message = humintManager.getSecureComms().sendSecureMessage(req.body);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Dead drop endpoints
app.get('/api/comms/deaddrops', (req, res) => {
  try {
    const { status } = req.query;
    const deadDrops = humintManager.getSecureComms().getDeadDrops(status as string | undefined);
    res.json(deadDrops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dead drops' });
  }
});

app.post('/api/comms/deaddrops', (req, res) => {
  try {
    const deadDrop = humintManager.getSecureComms().scheduleDeadDrop(req.body);
    res.status(201).json(deadDrop);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`HUMINT Service running on port ${port}`);
  console.log(`Dashboard: http://localhost:${port}/api/dashboard`);
});

export default app;
