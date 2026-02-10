import { getPostgresPool } from '../db/postgres.js';
import { provenanceLedger } from '../provenance/ledger.js';
import logger from '../config/logger.js';
import { randomUUID } from 'crypto';

export interface Incident {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'resolved';
  runbook_id?: string;
  provenance_chain_id?: string;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  created_by: string;
}

export interface RunbookStep {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  type: 'manual' | 'automated';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  workflow_id?: string;
  sequence_order: number;
  executed_at?: Date;
  executed_by?: string;
  output?: any;
}

class IncidentService {
  private static instance: IncidentService;
  private logger = logger.child({ service: 'IncidentService' });

  private constructor() {}

  public static getInstance(): IncidentService {
    if (!IncidentService.instance) {
      IncidentService.instance = new IncidentService();
    }
    return IncidentService.instance;
  }

  // Helper to ensure tables exist (dev/sandbox convenience)
  public async ensureSchema(): Promise<void> {
    const pool = getPostgresPool();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS incidents (
          id UUID PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          severity VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          runbook_id VARCHAR(255),
          provenance_chain_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_by VARCHAR(255) NOT NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS incident_runbook_steps (
          id UUID PRIMARY KEY,
          incident_id UUID REFERENCES incidents(id),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          workflow_id VARCHAR(255),
          sequence_order INTEGER NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE,
          executed_by VARCHAR(255),
          output JSONB
        );
      `);
    } catch (err) {
      this.logger.error({ err }, 'Failed to ensure schema');
      // Suppress error if table exists race condition or permissions
    }
  }

  public async createIncident(params: {
    tenantId: string;
    title: string;
    description: string;
    severity: Incident['severity'];
    userId: string;
    provenanceChainId?: string;
    runbookId?: string; // If provided, we'd hydrate steps from a template
  }): Promise<Incident> {
    await this.ensureSchema();
    const pool = getPostgresPool();
    const id = randomUUID();
    const now = new Date();

    const incident: Incident = {
      id,
      tenant_id: params.tenantId,
      title: params.title,
      description: params.description,
      severity: params.severity,
      status: 'open',
      provenance_chain_id: params.provenanceChainId,
      runbook_id: params.runbookId,
      created_at: now,
      updated_at: now,
      created_by: params.userId
    };

    await pool.query(
      `INSERT INTO incidents (
        id, tenant_id, title, description, severity, status,
        provenance_chain_id, runbook_id, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        incident.id, incident.tenant_id, incident.title, incident.description,
        incident.severity, incident.status, incident.provenance_chain_id,
        incident.runbook_id, incident.created_at, incident.updated_at, incident.created_by
      ]
    );

    // Record in Provenance Ledger
    try {
      await provenanceLedger.appendEntry({
        tenantId: params.tenantId,
        actionType: 'INCIDENT_CREATED',
        resourceType: 'incident',
        resourceId: id,
        actorId: params.userId,
        actorType: 'user',
        payload: { title: params.title, severity: params.severity },
        metadata: { provenanceChainId: params.provenanceChainId }
      });
    } catch (e) {
      this.logger.error({ err: e }, 'Failed to record provenance for incident creation');
    }

    // If runbookId is provided, we would load the template and create steps.
    // For this MVP, we'll create a default set of steps if runbookId is 'default' or similar.
    if (params.runbookId) {
      await this.hydrateRunbook(id, params.runbookId);
    }

    return incident;
  }

  private async hydrateRunbook(incidentId: string, runbookId: string) {
    // Mock runbook hydration for MVP
    const steps = [
      { title: 'Assess Impact', description: 'Determine the scope of the incident.', type: 'manual' },
      { title: 'Containment', description: 'Stop the bleeding.', type: 'manual' },
      { title: 'Mitigation', description: 'Apply fixes.', type: 'automated', workflowId: 'mitigate-v1' },
      { title: 'Review', description: 'Post-incident review.', type: 'manual' }
    ];

    const pool = getPostgresPool();
    let order = 1;
    for (const step of steps) {
      const stepId = randomUUID();
      await pool.query(
        `INSERT INTO incident_runbook_steps (
          id, incident_id, title, description, type, status, workflow_id, sequence_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [stepId, incidentId, step.title, step.description, step.type, 'pending', step.workflowId || null, order++]
      );
    }
  }

  public async getIncident(id: string): Promise<Incident | null> {
    await this.ensureSchema();
    const pool = getPostgresPool();
    const res = await pool.query(`SELECT * FROM incidents WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return res.rows[0] as Incident;
  }

  public async listIncidents(tenantId: string): Promise<Incident[]> {
    await this.ensureSchema();
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM incidents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows as Incident[];
  }

  public async getRunbookSteps(incidentId: string): Promise<RunbookStep[]> {
    await this.ensureSchema();
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM incident_runbook_steps WHERE incident_id = $1 ORDER BY sequence_order ASC`,
      [incidentId]
    );
    return res.rows as RunbookStep[];
  }

  public async executeStep(incidentId: string, stepId: string, userId: string): Promise<RunbookStep> {
    const pool = getPostgresPool();

    // 1. Get step
    const stepRes = await pool.query(`SELECT * FROM incident_runbook_steps WHERE id = $1 AND incident_id = $2`, [stepId, incidentId]);
    if (stepRes.rows.length === 0) throw new Error('Step not found');
    const step = stepRes.rows[0] as RunbookStep;

    // 2. Execute logic (mock workflow trigger for automated)
    const now = new Date();
    let output = {};

    if (step.type === 'automated' && step.workflow_id) {
       // Mock workflow execution
       output = { workflow_execution_id: randomUUID(), status: 'triggered' };
       this.logger.info({ stepId, workflowId: step.workflow_id }, 'Triggered automated workflow');
    }

    // 3. Update step
    const updateRes = await pool.query(
      `UPDATE incident_runbook_steps
       SET status = 'completed', executed_at = $1, executed_by = $2, output = $3
       WHERE id = $4
       RETURNING *`,
      [now, userId, JSON.stringify(output), stepId]
    );

    // 4. Provenance
    const incident = await this.getIncident(incidentId);
    if (incident) {
      try {
        await provenanceLedger.appendEntry({
          tenantId: incident.tenant_id,
          actionType: 'RUNBOOK_STEP_EXECUTED',
          resourceType: 'incident_step',
          resourceId: stepId,
          actorId: userId,
          actorType: 'user',
          payload: { stepTitle: step.title, output },
          metadata: { incidentId }
        });
      } catch (e) {
        this.logger.error({ err: e }, 'Failed to record provenance for runbook execution');
      }
    }

    return updateRes.rows[0] as RunbookStep;
  }
}

export const incidentService = IncidentService.getInstance();
