import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface IntegrationTestState {
  graphs: Map<string, GraphRecord>;
  runs: Map<string, RunRecord>;
  approvals: Map<string, ApprovalRecord>;
  auditEvents: AuditEventRecord[];
  provenanceByCorrelationId: Map<string, ProvenanceRecord[]>;
  analyses: Map<string, AnalysisRecord>;
}

interface GraphRecord {
  id: string;
  name: string;
  description: string;
  settings: Record<string, unknown>;
  entities: EntityRecord[];
}

interface EntityRecord {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

interface RunRecord {
  id: string;
  status: 'pending' | 'running' | 'completed';
  budgets: Record<string, unknown>;
  tasks: Array<Record<string, unknown>>;
  approvals: string[];
}

interface ApprovalRecord {
  id: string;
  runId: string;
  status: 'pending' | 'approved';
}

interface AuditEventRecord {
  eventId: string;
  correlationId?: string;
  details: Record<string, unknown>;
}

interface ProvenanceRecord {
  evidenceId: string;
  checksum: string;
  metadata: Record<string, unknown>;
}

interface AnalysisRecord {
  id: string;
  workspaceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
}

interface LoginBody {
  email: string;
  password: string;
}

export function createIntegrationTestServer() {
  const app = express();
  app.use(express.json());

  const state: IntegrationTestState = {
    graphs: new Map(),
    runs: new Map(),
    approvals: new Map(),
    auditEvents: [],
    provenanceByCorrelationId: new Map(),
    analyses: new Map(),
  };

  const testUser = {
    email: 'test@intelgraph.ai',
    password: 'TestPassword123!',
  };

  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/auth/login') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return next();
  };

  app.use(authMiddleware);

  app.post('/api/auth/login', (req: Request<unknown, unknown, LoginBody>, res) => {
    if (req.body.email === testUser.email && req.body.password === testUser.password) {
      return res.json({ token: `token-${randomUUID()}`, user: { email: testUser.email } });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      components: { database: 'healthy', redis: 'healthy', neo4j: 'healthy' },
    });
  });

  app.get('/api/maestro/v1/health', (_req, res) => {
    res.json({ orchestrator: 'running', workers: 3 });
  });

  app.post('/api/graphs', (req, res) => {
    const id = randomUUID();
    const record: GraphRecord = {
      id,
      name: req.body.name,
      description: req.body.description,
      settings: req.body.settings ?? {},
      entities: [],
    };

    state.graphs.set(id, record);
    res.status(201).json(record);
  });

  app.get('/api/graphs', (_req, res) => {
    const graphs = Array.from(state.graphs.values());

    res.json({ graphs, totalCount: graphs.length });
  });

  app.post('/api/graphs/:graphId/entities', (req, res) => {
    const graph = state.graphs.get(req.params.graphId);
    if (!graph) {
      return res.status(404).json({ message: 'Graph not found' });
    }

    const entity: EntityRecord = {
      id: randomUUID(),
      type: req.body.type,
      properties: req.body.properties ?? {},
    };
    graph.entities.push(entity);

    return res.status(201).json(entity);
  });

  app.get('/api/graphs/:graphId/entities', (req, res) => {
    const graph = state.graphs.get(req.params.graphId);
    if (!graph) {
      return res.status(404).json({ message: 'Graph not found' });
    }

    res.json({ entities: graph.entities, totalCount: graph.entities.length });
  });

  app.post('/api/graphs/:graphId/analyze', (req, res) => {
    if (!state.graphs.has(req.params.graphId)) {
      return res.status(404).json({ message: 'Graph not found' });
    }

    res.json({ jobId: randomUUID(), status: 'started', request: req.body });
  });

  app.post('/api/maestro/v1/runs', (req, res) => {
    const id = randomUUID();
    const approvalId = randomUUID();
    const run: RunRecord = {
      id,
      status: 'pending',
      budgets: req.body.budgets ?? {},
      tasks: [],
      approvals: [approvalId],
    };
    state.runs.set(id, run);
    state.approvals.set(approvalId, { id: approvalId, runId: id, status: 'pending' });

    res.status(201).json({ runId: id, status: run.status });
  });

  app.get('/api/maestro/v1/runs/:runId', (req, res) => {
    const run = state.runs.get(req.params.runId);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    res.json({ id: run.id, status: run.status, budgets: run.budgets, tasks: run.tasks });
  });

  app.get('/api/maestro/v1/runs/:runId/approvals', (req, res) => {
    const run = state.runs.get(req.params.runId);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    const pending = run.approvals
      .map((id) => state.approvals.get(id))
      .filter((approval): approval is ApprovalRecord => Boolean(approval))
      .filter((approval) => approval.status === 'pending');

    res.json({ pending });
  });

  app.post('/api/maestro/v1/approvals/:approvalId/approve', (req, res) => {
    const approval = state.approvals.get(req.params.approvalId);
    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    approval.status = 'approved';
    const run = state.runs.get(approval.runId);
    if (run) {
      run.status = 'running';
    }

    res.json({ id: approval.id, status: approval.status, reason: req.body?.reason });
  });

  app.post('/api/maestro/v1/routing/optimize', (req, res) => {
    res.json({
      selectedModel: 'gpt-4o',
      estimatedCost: 4.5,
      estimatedLatency: 1200,
      routingReason: 'Matches high complexity intelligence request',
      request: req.body,
    });
  });

  app.get('/api/maestro/v1/routing/analytics', (_req, res) => {
    res.json({
      models: ['gpt-4o', 'claude-3.5'],
      performance: { successRate: 0.98 },
      costEfficiency: { average: 0.87 },
    });
  });

  app.post('/api/maestro/v1/policy/evaluate', (req, res) => {
    res.json({ allowed: true, reason: 'Mock policy approve', riskScore: 0.12, context: req.body });
  });

  app.post('/api/maestro/v1/compliance/reports', (req, res) => {
    res.json({
      framework: req.body.framework ?? 'SOC2',
      summary: 'All controls passing in mock environment',
      violations: [],
      recommendations: ['Continue monitoring'],
    });
  });

  app.post('/api/maestro/v1/audit/events', (req, res) => {
    const eventId = randomUUID();
    state.auditEvents.push({
      eventId,
      correlationId: req.headers['x-correlation-id']?.toString(),
      details: req.body ?? {},
    });
    res.status(201).json({ eventId });
  });

  app.get('/api/maestro/v1/audit/events', (req, res) => {
    const correlationIds = (req.query.correlationIds as string[] | undefined) ?? [];
    const filtered = correlationIds.length
      ? state.auditEvents.filter((event) => correlationIds.includes(event.correlationId ?? ''))
      : state.auditEvents;

    res.json({ events: filtered });
  });

  app.post('/api/maestro/v1/audit/verify', (req, res) => {
    const eventsInRange = state.auditEvents.filter((event) => {
      const created = event.details.createdAt ? Number(event.details.createdAt) : Date.now();
      return created >= Date.parse(req.body.startDate) && created <= Date.parse(req.body.endDate);
    });

    res.json({
      valid: true,
      totalEvents: eventsInRange.length,
      validEvents: eventsInRange.length,
      invalidEvents: 0,
    });
  });

  app.post('/api/sig/v1/evidence/register', (req, res) => {
    const evidenceId = randomUUID();
    const checksum = randomUUID();
    const correlationId = req.headers['x-correlation-id']?.toString() ?? 'unknown';
    const record: ProvenanceRecord = {
      evidenceId,
      checksum,
      metadata: req.body?.metadata ?? {},
    };

    const existing = state.provenanceByCorrelationId.get(correlationId) ?? [];
    existing.push(record);
    state.provenanceByCorrelationId.set(correlationId, existing);

    res.status(201).json({ evidenceId, checksum, receipt: `receipt-${evidenceId}` });
  });

  app.get('/api/sig/v1/provenance/validate', (req, res) => {
    const correlationId = req.query.correlationId?.toString() ?? 'unknown';
    const chain = state.provenanceByCorrelationId.get(correlationId) ?? [];

    res.json({ valid: chain.length > 0, chain });
  });

  app.get('/api/maestro/v1/metrics', (_req, res) => {
    res.json({
      system: { cpu: 0.42, memory: 0.38 },
      database: { latencyMs: 12 },
      orchestration: { queueDepth: 1 },
      timestamp: Date.now(),
    });
  });

  app.get('/api/maestro/v1/circuit-breaker/status', (_req, res) => {
    res.json({ circuits: { neo4j: 'closed', postgres: 'closed' } });
  });

  app.post('/api/investigations', (req, res) => {
    const workspaceId = randomUUID();
    res.status(201).json({ id: workspaceId, name: req.body.name, description: req.body.description });
  });

  app.post('/api/investigations/:workspaceId/analyze', (req, res) => {
    const analysisId = randomUUID();
    state.analyses.set(analysisId, {
      id: analysisId,
      workspaceId: req.params.workspaceId,
      status: 'running',
      createdAt: Date.now(),
    });

    res.status(202).json({ analysisId, status: 'running', request: req.body });
  });

  app.get('/api/investigations/:workspaceId/analyses/:analysisId', (req, res) => {
    const analysis = state.analyses.get(req.params.analysisId);
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    const elapsed = Date.now() - analysis.createdAt;
    if (elapsed > 500) {
      analysis.status = 'completed';
    }

    res.json({ id: analysis.id, status: analysis.status, workspaceId: analysis.workspaceId });
  });

  app.get('/api/investigations/:workspaceId/results', (req, res) => {
    const analysis = Array.from(state.analyses.values()).find(
      (item) => item.workspaceId === req.params.workspaceId,
    );

    if (!analysis) {
      return res.status(404).json({ message: 'No analysis for workspace' });
    }

    res.json({
      results: [{ id: randomUUID(), summary: 'Mock analysis result' }],
      artifacts: [{ id: randomUUID(), type: 'report' }],
      provenance:
        state.provenanceByCorrelationId.get(
          req.headers['x-correlation-id']?.toString() ?? '',
        ) ?? [],
    });
  });

  const reset = () => {
    state.graphs.clear();
    state.runs.clear();
    state.approvals.clear();
    state.auditEvents = [];
    state.provenanceByCorrelationId.clear();
    state.analyses.clear();
  };

  return { app, state, reset, testUser };
}
