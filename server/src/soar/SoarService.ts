
import { Pool } from 'pg';
import { WorkflowEngine } from './WorkflowEngine.js';
import { Playbook, PlaybookRun } from './types.js';
import logger from '../config/logger.js';
import { randomUUID } from 'crypto';

const serviceLogger = logger.child({ name: 'SoarService' });

export class SoarService {
  private engine: WorkflowEngine;

  constructor(private pg: Pool) {
    this.engine = new WorkflowEngine(pg);
  }

  /**
   * Create a new playbook
   */
  async createPlaybook(input: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Playbook> {
    const id = randomUUID();
    const { rows } = await this.pg.query(
      `INSERT INTO maestro.playbooks (
        id, tenant_id, name, description, workflow, triggers, is_active, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        input.tenantId,
        input.name,
        input.description,
        JSON.stringify(input.workflow),
        JSON.stringify(input.triggers),
        input.isActive,
        input.createdBy,
        JSON.stringify(input.metadata)
      ]
    );
    return this.mapPlaybook(rows[0]);
  }

  /**
   * List playbooks
   */
  async listPlaybooks(tenantId: string): Promise<Playbook[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.playbooks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows.map(this.mapPlaybook);
  }

  /**
   * Get playbook by ID
   */
  async getPlaybook(id: string, tenantId: string): Promise<Playbook | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.playbooks WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return rows[0] ? this.mapPlaybook(rows[0]) : null;
  }

  /**
   * Trigger a playbook run
   */
  async runPlaybook(playbookId: string, tenantId: string, context: any, triggeredBy?: string, caseId?: string): Promise<PlaybookRun> {
    const id = randomUUID();
    const { rows } = await this.pg.query(
      `INSERT INTO maestro.playbook_runs (
        id, tenant_id, playbook_id, status, context, triggered_by, case_id
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6)
      RETURNING *`,
      [id, tenantId, playbookId, JSON.stringify(context), triggeredBy, caseId]
    );

    // Asynchronously execute the run
    // In production this should be a job queue
    this.engine.executeRun(id).catch(err => {
        serviceLogger.error({ runId: id, err }, 'Async execution failed');
    });

    return this.mapRun(rows[0]);
  }

  /**
   * List runs for a playbook or case
   */
  async listRuns(tenantId: string, filters: { playbookId?: string, caseId?: string }): Promise<PlaybookRun[]> {
      let query = `SELECT * FROM maestro.playbook_runs WHERE tenant_id = $1`;
      const params: any[] = [tenantId];

      if (filters.playbookId) {
          query += ` AND playbook_id = $${params.push(filters.playbookId)}`;
      }
      if (filters.caseId) {
          query += ` AND case_id = $${params.push(filters.caseId)}`;
      }

      query += ` ORDER BY started_at DESC LIMIT 50`;

      const { rows } = await this.pg.query(query, params);
      return rows.map(this.mapRun);
  }

  private mapPlaybook(row: any): Playbook {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        workflow: row.workflow,
        triggers: row.triggers || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        metadata: row.metadata || {}
    };
  }

  private mapRun(row: any): PlaybookRun {
      return {
          id: row.id,
          tenantId: row.tenant_id,
          playbookId: row.playbook_id,
          caseId: row.case_id,
          status: row.status,
          context: row.context || {},
          stepsState: row.steps_state || [],
          result: row.result,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          error: row.error,
          triggeredBy: row.triggered_by
      };
  }
}
