import { Pool } from 'pg';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'WorkflowTemplateRepo' });

export interface WorkflowTemplateVariable {
  name: string;
  type?: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
}

interface WorkflowTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  argo_template: any;
  variables: any;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  argoTemplate: Record<string, unknown>;
  variables: WorkflowTemplateVariable[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowTemplateInput {
  tenantId: string;
  name: string;
  description?: string;
  argoTemplate: Record<string, unknown>;
  variables?: WorkflowTemplateVariable[];
}

export class WorkflowTemplateRepo {
  constructor(private readonly pg: Pool) {}

  async createTemplate(input: CreateWorkflowTemplateInput, userId: string): Promise<WorkflowTemplate> {
    const variables = (input.variables || []).map((variable) => ({
      ...variable,
      required: Boolean(variable.required),
    }));

    const { rows } = await this.pg.query<WorkflowTemplateRow>(
      `INSERT INTO workflow_templates (tenant_id, name, description, argo_template, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.tenantId,
        input.name,
        input.description ?? null,
        JSON.stringify(input.argoTemplate),
        JSON.stringify(variables),
        userId,
      ],
    );

    const row = rows[0];
    repoLogger.debug({ templateId: row?.id }, 'Workflow template created');
    return this.mapRow(row);
  }

  async getTemplateById(id: string, tenantId: string): Promise<WorkflowTemplate | null> {
    const { rows } = await this.pg.query<WorkflowTemplateRow>(
      `SELECT * FROM workflow_templates WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRow(rows[0]);
  }

  async listTemplates(tenantId: string, limit = 20, offset = 0): Promise<WorkflowTemplate[]> {
    const { rows } = await this.pg.query<WorkflowTemplateRow>(
      `SELECT * FROM workflow_templates
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: WorkflowTemplateRow): WorkflowTemplate {
    const argoTemplate = this.ensureObject(row.argo_template, {});
    const variables = this.ensureArray(row.variables).map((variable: any) => ({
      name: variable?.name,
      type: variable?.type ?? undefined,
      description: variable?.description ?? undefined,
      required: Boolean(variable?.required),
      defaultValue: variable?.defaultValue,
    }));

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      argoTemplate,
      variables,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private ensureObject(value: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
    if (!value) {
      return fallback;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        repoLogger.warn({ error }, 'Failed to parse argo template JSON value; returning fallback');
        return fallback;
      }
    }

    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return fallback;
  }

  private ensureArray(value: unknown): any[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        repoLogger.warn({ error }, 'Failed to parse workflow template variable list');
        return [];
      }
    }

    if (Array.isArray(value)) {
      return value;
    }

    return [];
  }
}
