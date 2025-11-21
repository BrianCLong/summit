import { Express, Request, Response } from 'express';
import { SupplierRiskAssessor } from '@intelgraph/supplier-risk';
import { ThirdPartyRiskManager } from '@intelgraph/third-party-risk';
import { ComplianceMonitor } from '@intelgraph/compliance-monitor';
import {
  SupplyChainNode,
  RiskAssessment,
  Incident,
  Alert,
  DisruptionPrediction,
} from '@intelgraph/supply-chain-types';

// In-memory storage (replace with database in production)
const nodes = new Map<string, SupplyChainNode>();
const riskAssessments = new Map<string, RiskAssessment[]>();
const incidents = new Map<string, Incident>();
const alerts = new Map<string, Alert>();
const predictions = new Map<string, DisruptionPrediction[]>();

// Initialize services
const supplierRiskAssessor = new SupplierRiskAssessor();
const vendorManager = new ThirdPartyRiskManager();
const complianceMonitor = new ComplianceMonitor();

export function setupRoutes(app: Express): void {
  // ============================================================================
  // Supplier Risk Assessment Routes
  // ============================================================================

  // Assess supplier risk
  app.post('/api/risk/supplier/:nodeId/assess', async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const node = nodes.get(nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const { financialMetrics, cyberPosture, esgScore } = req.body;

    const assessment = await supplierRiskAssessor.assessSupplier(
      node,
      financialMetrics,
      cyberPosture,
      esgScore
    );

    // Store assessment
    if (!riskAssessments.has(nodeId)) {
      riskAssessments.set(nodeId, []);
    }
    assessment.categoryRisks.forEach(risk => {
      riskAssessments.get(nodeId)!.push(risk);
    });

    res.json(assessment);
  });

  // Get risk assessments for a node
  app.get('/api/risk/supplier/:nodeId', (req: Request, res: Response) => {
    const assessments = riskAssessments.get(req.params.nodeId) || [];
    res.json({ assessments, total: assessments.length });
  });

  // Assess financial health
  app.post('/api/risk/financial/:nodeId', (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const { metrics } = req.body;

    if (!metrics) {
      return res.status(400).json({ error: 'Financial metrics required' });
    }

    const assessment = supplierRiskAssessor.assessFinancialHealth(nodeId, metrics);
    res.json(assessment);
  });

  // Assess cybersecurity posture
  app.post('/api/risk/cybersecurity/:nodeId', (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const { posture } = req.body;

    if (!posture) {
      return res.status(400).json({ error: 'Cybersecurity posture required' });
    }

    const assessment = supplierRiskAssessor.assessCybersecurity(nodeId, posture);
    res.json(assessment);
  });

  // ============================================================================
  // Third-Party Risk Management Routes
  // ============================================================================

  // Initiate vendor onboarding
  app.post('/api/vendor/onboard', (req: Request, res: Response) => {
    const { vendorId, vendorName } = req.body;
    if (!vendorId || !vendorName) {
      return res.status(400).json({ error: 'vendorId and vendorName required' });
    }

    const onboarding = vendorManager.initiateOnboarding(vendorId, vendorName);
    res.status(201).json(onboarding);
  });

  // Conduct vendor assessment
  app.post('/api/vendor/:vendorId/assess', async (req: Request, res: Response) => {
    const { vendorId } = req.params;
    const node = nodes.get(vendorId);

    if (!node) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const { assessmentType } = req.body;
    const assessment = await vendorManager.conductAssessment(
      node,
      assessmentType || 'periodic-review'
    );

    res.json(assessment);
  });

  // Monitor vendor
  app.post('/api/vendor/:vendorId/monitor', async (req: Request, res: Response) => {
    const { vendorId } = req.params;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Monitoring config required' });
    }

    const monitoring = await vendorManager.monitorVendor(vendorId, config);
    res.json(monitoring);
  });

  // ============================================================================
  // Compliance Routes
  // ============================================================================

  // Check compliance status
  app.post('/api/compliance/:nodeId/check', async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    const node = nodes.get(nodeId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const { requirements } = req.body;
    if (!requirements || !Array.isArray(requirements)) {
      return res.status(400).json({ error: 'Compliance requirements array required' });
    }

    const compliance = await complianceMonitor.checkCompliance(node, requirements);
    res.json(compliance);
  });

  // Screen against export controls
  app.post('/api/compliance/export-control/screen', async (req: Request, res: Response) => {
    const { entityId, entityName, country } = req.body;
    if (!entityId || !entityName || !country) {
      return res.status(400).json({ error: 'entityId, entityName, and country required' });
    }

    const screening = await complianceMonitor.screenExportControl(entityId, entityName, country);
    res.json(screening);
  });

  // Assess conflict minerals
  app.post('/api/compliance/conflict-minerals/:componentId', async (req: Request, res: Response) => {
    const { componentId } = req.params;
    const { bomData } = req.body;

    if (!bomData) {
      return res.status(400).json({ error: 'BOM data required' });
    }

    const assessment = await complianceMonitor.assessConflictMinerals(componentId, bomData);
    res.json(assessment);
  });

  // Track regulatory changes
  app.get('/api/compliance/regulatory-changes', async (req: Request, res: Response) => {
    const { jurisdiction } = req.query;
    const changes = await complianceMonitor.trackRegulatoryChanges(
      (jurisdiction as string) || 'United States'
    );
    res.json({ changes, total: changes.length });
  });

  // ============================================================================
  // Incident Management Routes
  // ============================================================================

  // Create incident
  app.post('/api/incidents', (req: Request, res: Response) => {
    const incident = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    incidents.set(incident.id, incident);
    res.status(201).json(incident);
  });

  // Get all incidents
  app.get('/api/incidents', (req: Request, res: Response) => {
    const { status, severity } = req.query;
    let results = Array.from(incidents.values());

    if (status) {
      results = results.filter(i => i.status === status);
    }
    if (severity) {
      results = results.filter(i => i.severity === severity);
    }

    res.json({ incidents: results, total: results.length });
  });

  // Get incident by ID
  app.get('/api/incidents/:id', (req: Request, res: Response) => {
    const incident = incidents.get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  });

  // Update incident
  app.put('/api/incidents/:id', (req: Request, res: Response) => {
    const incident = incidents.get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const updated = { ...incident, ...req.body, updatedAt: new Date() };
    incidents.set(req.params.id, updated);
    res.json(updated);
  });

  // ============================================================================
  // Alert Management Routes
  // ============================================================================

  // Create alert
  app.post('/api/alerts', (req: Request, res: Response) => {
    const alert = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
    };
    alerts.set(alert.id, alert);
    res.status(201).json(alert);
  });

  // Get all alerts
  app.get('/api/alerts', (req: Request, res: Response) => {
    const { severity, resolved } = req.query;
    let results = Array.from(alerts.values());

    if (severity) {
      results = results.filter(a => a.severity === severity);
    }
    if (resolved !== undefined) {
      results = results.filter(a =>
        resolved === 'true' ? a.resolvedAt !== undefined : a.resolvedAt === undefined
      );
    }

    res.json({ alerts: results, total: results.length });
  });

  // Acknowledge alert
  app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = {
      ...alert,
      acknowledgedAt: new Date(),
      acknowledgedBy: req.body.userId || 'system',
    };
    alerts.set(req.params.id, updated);
    res.json(updated);
  });

  // Resolve alert
  app.post('/api/alerts/:id/resolve', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = {
      ...alert,
      resolvedAt: new Date(),
    };
    alerts.set(req.params.id, updated);
    res.json(updated);
  });

  // ============================================================================
  // Predictive Analytics Routes
  // ============================================================================

  // Get disruption predictions
  app.get('/api/predictions/disruptions', (req: Request, res: Response) => {
    const { nodeId, componentId } = req.query;
    let results: DisruptionPrediction[] = [];

    for (const preds of predictions.values()) {
      results.push(...preds);
    }

    if (nodeId) {
      results = results.filter(p => p.nodeId === nodeId);
    }
    if (componentId) {
      results = results.filter(p => p.componentId === componentId);
    }

    res.json({ predictions: results, total: results.length });
  });

  // Create prediction
  app.post('/api/predictions', (req: Request, res: Response) => {
    const prediction = {
      ...req.body,
      id: req.body.id || crypto.randomUUID(),
      generatedAt: new Date(),
    };

    const key = prediction.nodeId || prediction.componentId || 'global';
    if (!predictions.has(key)) {
      predictions.set(key, []);
    }
    predictions.get(key)!.push(prediction);

    res.status(201).json(prediction);
  });

  // ============================================================================
  // Analytics and Reporting Routes
  // ============================================================================

  // Get risk summary
  app.get('/api/analytics/risk-summary', (req: Request, res: Response) => {
    const allAssessments = Array.from(riskAssessments.values()).flat();

    const summary = {
      totalAssessments: allAssessments.length,
      byCategory: {
        financial: allAssessments.filter(a => a.category === 'financial').length,
        cybersecurity: allAssessments.filter(a => a.category === 'cybersecurity').length,
        geopolitical: allAssessments.filter(a => a.category === 'geopolitical').length,
        esg: allAssessments.filter(a => a.category === 'esg').length,
        operational: allAssessments.filter(a => a.category === 'operational').length,
      },
      byLevel: {
        low: allAssessments.filter(a => a.level === 'low').length,
        medium: allAssessments.filter(a => a.level === 'medium').length,
        high: allAssessments.filter(a => a.level === 'high').length,
        critical: allAssessments.filter(a => a.level === 'critical').length,
      },
      averageScore: allAssessments.length > 0
        ? allAssessments.reduce((sum, a) => sum + a.score, 0) / allAssessments.length
        : 0,
    };

    res.json(summary);
  });

  // Get incident statistics
  app.get('/api/analytics/incident-stats', (req: Request, res: Response) => {
    const allIncidents = Array.from(incidents.values());

    const stats = {
      total: allIncidents.length,
      byStatus: {
        open: allIncidents.filter(i => i.status === 'open').length,
        investigating: allIncidents.filter(i => i.status === 'investigating').length,
        mitigating: allIncidents.filter(i => i.status === 'mitigating').length,
        resolved: allIncidents.filter(i => i.status === 'resolved').length,
        closed: allIncidents.filter(i => i.status === 'closed').length,
      },
      bySeverity: {
        low: allIncidents.filter(i => i.severity === 'low').length,
        medium: allIncidents.filter(i => i.severity === 'medium').length,
        high: allIncidents.filter(i => i.severity === 'high').length,
        critical: allIncidents.filter(i => i.severity === 'critical').length,
      },
      byType: allIncidents.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json(stats);
  });
}
