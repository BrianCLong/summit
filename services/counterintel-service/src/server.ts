/**
 * Counterintelligence Operations Service
 *
 * Centralized service for counterintelligence operations, threat detection,
 * and security management
 */

import express from 'express';
import type { Request, Response } from 'express';
import {
  BehavioralAnomalyDetector,
  PrivilegedAccessMonitor
} from '@intelgraph/insider-threat';
import {
  SurveillanceDetector,
  SocialEngineeringDetector
} from '@intelgraph/espionage-detection';
import {
  InfluenceCampaignDetector,
  DisinformationTracker
} from '@intelgraph/foreign-influence';
import {
  CounterspyCaseManager,
  DoubleAgentHandler
} from '@intelgraph/counterespionage';
import {
  ClearanceAdjudicationManager,
  ForeignContactManager
} from '@intelgraph/personnel-security';
import {
  TSCMOperationsManager,
  TEMPESTAssessor,
  SupplyChainSecurityManager
} from '@intelgraph/technical-ci';

const app = express();
app.use(express.json());

// Initialize all managers and detectors
const behavioralDetector = new BehavioralAnomalyDetector({
  sensitivityLevel: 'HIGH',
  minimumConfidence: 0.75,
  lookbackPeriodDays: 90,
  enableMLModels: true,
  alertThreshold: 50
});

const accessMonitor = new PrivilegedAccessMonitor();
const surveillanceDetector = new SurveillanceDetector();
const seDetector = new SocialEngineeringDetector();
const influenceDetector = new InfluenceCampaignDetector();
const disinfTracker = new DisinformationTracker();
const caseManager = new CounterspyCaseManager();
const agentHandler = new DoubleAgentHandler();
const clearanceManager = new ClearanceAdjudicationManager();
const contactManager = new ForeignContactManager();
const tscmManager = new TSCMOperationsManager();
const tempestAssessor = new TEMPESTAssessor();
const supplyChainManager = new SupplyChainSecurityManager();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'counterintel-service',
    timestamp: new Date().toISOString()
  });
});

// Insider Threat API
app.post('/api/insider-threat/detect', async (req: Request, res: Response) => {
  try {
    const { userId, activityData } = req.body;
    const anomalies = await behavioralDetector.detectAnomalies(userId, activityData);
    res.json({ anomalies });
  } catch (error) {
    res.status(500).json({ error: 'Detection failed' });
  }
});

app.post('/api/insider-threat/monitor-access', async (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    const alerts = await accessMonitor.monitorAccess(event);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Monitoring failed' });
  }
});

// Espionage Detection API
app.post('/api/espionage/detect-surveillance', async (req: Request, res: Response) => {
  try {
    const { targetId, observationData } = req.body;
    const surveillance = await surveillanceDetector.detectPhysicalSurveillance(targetId, observationData);
    res.json({ surveillance });
  } catch (error) {
    res.status(500).json({ error: 'Detection failed' });
  }
});

app.post('/api/espionage/analyze-elicitation', async (req: Request, res: Response) => {
  try {
    const { targetId, communication } = req.body;
    const attempt = await seDetector.analyzeForElicitation(targetId, communication);
    res.json({ attempt });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Foreign Influence API
app.post('/api/influence/detect-campaign', async (req: Request, res: Response) => {
  try {
    const campaign = await influenceDetector.detectCampaign(req.body);
    res.json({ campaign });
  } catch (error) {
    res.status(500).json({ error: 'Detection failed' });
  }
});

app.get('/api/influence/campaigns', (req: Request, res: Response) => {
  const campaigns = influenceDetector.getCampaigns();
  res.json({ campaigns });
});

app.post('/api/influence/track-disinformation', async (req: Request, res: Response) => {
  try {
    const incident = await disinfTracker.trackDisinformation(req.body);
    res.json({ incident });
  } catch (error) {
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Counterespionage API
app.post('/api/counterspy/case', (req: Request, res: Response) => {
  try {
    const newCase = caseManager.createCase(req.body);
    res.json({ case: newCase });
  } catch (error) {
    res.status(500).json({ error: 'Case creation failed' });
  }
});

app.get('/api/counterspy/cases', (req: Request, res: Response) => {
  const { status } = req.query;
  const cases = caseManager.getCases(status as string);
  res.json({ cases });
});

app.post('/api/counterspy/double-agent', (req: Request, res: Response) => {
  try {
    const agent = agentHandler.registerAgent(req.body);
    res.json({ agent });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/counterspy/double-agents/active', (req: Request, res: Response) => {
  const agents = agentHandler.getActiveAgents();
  res.json({ agents });
});

// Personnel Security API
app.post('/api/personnel/investigation', (req: Request, res: Response) => {
  try {
    const { subjectId, clearanceLevel } = req.body;
    const investigation = clearanceManager.initiateInvestigation(subjectId, clearanceLevel);
    res.json({ investigation });
  } catch (error) {
    res.status(500).json({ error: 'Investigation initiation failed' });
  }
});

app.get('/api/personnel/clearance/:subjectId', (req: Request, res: Response) => {
  const clearance = clearanceManager.getClearance(req.params.subjectId);
  if (clearance) {
    res.json({ clearance });
  } else {
    res.status(404).json({ error: 'Clearance not found' });
  }
});

app.post('/api/personnel/foreign-contact', (req: Request, res: Response) => {
  try {
    const report = contactManager.submitReport(req.body);
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Report submission failed' });
  }
});

app.get('/api/personnel/foreign-contacts', (req: Request, res: Response) => {
  const { status } = req.query;
  const reports = contactManager.getReports(status as string);
  res.json({ reports });
});

// Technical CI API
app.post('/api/technical/tscm/sweep', (req: Request, res: Response) => {
  try {
    const { location, date, type } = req.body;
    const sweep = tscmManager.scheduleSweep(location, new Date(date), type);
    res.json({ sweep });
  } catch (error) {
    res.status(500).json({ error: 'Sweep scheduling failed' });
  }
});

app.get('/api/technical/tscm/sweeps', (req: Request, res: Response) => {
  const { status } = req.query;
  const sweeps = tscmManager.getSweeps(status as string);
  res.json({ sweeps });
});

app.post('/api/technical/tempest/assess', (req: Request, res: Response) => {
  try {
    const { facility, equipment } = req.body;
    const assessment = tempestAssessor.conductAssessment(facility, equipment);
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: 'Assessment failed' });
  }
});

app.post('/api/technical/supply-chain/assess', (req: Request, res: Response) => {
  try {
    const { vendor, component } = req.body;
    const assessment = supplyChainManager.assessVendor(vendor, component);
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: 'Assessment failed' });
  }
});

// Operational Security Endpoints
app.get('/api/opsec/threat-summary', (req: Request, res: Response) => {
  const summary = {
    insiderThreats: {
      activeAlerts: accessMonitor.getActiveAlerts().length,
      highRiskUsers: 0
    },
    espionage: {
      activeSurveillance: 0,
      elicitationAttempts: 0
    },
    foreignInfluence: {
      activeCampaigns: influenceDetector.getCampaigns().length,
      disinformationIncidents: disinfTracker.getIncidents().length
    },
    counterspy: {
      activeCases: caseManager.getCases('ACTIVE').length,
      activeDoubleAgents: agentHandler.getActiveAgents().length
    },
    technical: {
      scheduledSweeps: tscmManager.getSweeps('SCHEDULED').length,
      pendingAssessments: supplyChainManager.getAssessments('PENDING').length
    }
  };

  res.json({ summary });
});

// Inter-agency Coordination
app.get('/api/coordination/threat-briefing', (req: Request, res: Response) => {
  const briefing = {
    classification: 'SECRET',
    date: new Date().toISOString(),
    summary: 'Current counterintelligence threat assessment',
    threats: {
      insider: accessMonitor.getActiveAlerts().length,
      foreign: influenceDetector.getCampaigns().length,
      technical: 0
    },
    recommendations: [
      'Enhance monitoring of privileged access',
      'Increase frequency of TSCM sweeps',
      'Review foreign contact reports'
    ]
  };

  res.json({ briefing });
});

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`Counterintelligence Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
