/**
 * Incident Service
 * Business logic for incident management
 */

import { Pool } from 'pg';
import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentFilter,
  IncidentStatus,
} from '../models/incident';

export class IncidentService {
  constructor(private db: Pool) {}

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    const query = `
      INSERT INTO maestro.incidents (
        title, description, severity, affected_services, commander,
        responders, impact_description, customer_impact,
        estimated_affected_users, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      input.title,
      input.description,
      input.severity,
      input.affectedServices || [],
      input.commander,
      input.responders || [],
      input.impactDescription,
      input.customerImpact || false,
      input.estimatedAffectedUsers,
      JSON.stringify(input.metadata || {}),
      input.createdBy,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToIncident(result.rows[0]);
  }

  async getIncident(id: string): Promise<Incident | null> {
    const query = `SELECT * FROM maestro.incidents WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  async listIncidents(
    filter?: IncidentFilter,
    limit = 25,
    offset = 0
  ): Promise<Incident[]> {
    let query = `SELECT * FROM maestro.incidents WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filter) {
      if (filter.severity) {
        query += ` AND severity = $${paramIndex++}`;
        values.push(filter.severity);
      }
      if (filter.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filter.status);
      }
      if (filter.commander) {
        query += ` AND commander = $${paramIndex++}`;
        values.push(filter.commander);
      }
      if (filter.customerImpact !== undefined) {
        query += ` AND customer_impact = $${paramIndex++}`;
        values.push(filter.customerImpact);
      }
      if (filter.fromDate) {
        query += ` AND started_at >= $${paramIndex++}`;
        values.push(filter.fromDate);
      }
      if (filter.toDate) {
        query += ` AND started_at <= $${paramIndex++}`;
        values.push(filter.toDate);
      }
    }

    query += ` ORDER BY started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows.map((row) => this.mapRowToIncident(row));
  }

  async getActiveIncidents(): Promise<Incident[]> {
    const query = `
      SELECT * FROM maestro.active_incidents_view
      ORDER BY severity, started_at DESC
    `;
    const result = await this.db.query(query);
    return result.rows.map((row) => this.mapRowToIncident(row));
  }

  async updateIncident(
    id: string,
    input: UpdateIncidentInput
  ): Promise<Incident | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.severity !== undefined) {
      updates.push(`severity = $${paramIndex++}`);
      values.push(input.severity);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.affectedServices !== undefined) {
      updates.push(`affected_services = $${paramIndex++}`);
      values.push(input.affectedServices);
    }
    if (input.commander !== undefined) {
      updates.push(`commander = $${paramIndex++}`);
      values.push(input.commander);
    }
    if (input.responders !== undefined) {
      updates.push(`responders = $${paramIndex++}`);
      values.push(input.responders);
    }
    if (input.rootCause !== undefined) {
      updates.push(`root_cause = $${paramIndex++}`);
      values.push(input.rootCause);
    }
    if (input.impactDescription !== undefined) {
      updates.push(`impact_description = $${paramIndex++}`);
      values.push(input.impactDescription);
    }
    if (input.customerImpact !== undefined) {
      updates.push(`customer_impact = $${paramIndex++}`);
      values.push(input.customerImpact);
    }
    if (input.estimatedAffectedUsers !== undefined) {
      updates.push(`estimated_affected_users = $${paramIndex++}`);
      values.push(input.estimatedAffectedUsers);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.getIncident(id);
    }

    const query = `
      UPDATE maestro.incidents
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  async acknowledgeIncident(
    id: string,
    acknowledgedBy: string
  ): Promise<Incident | null> {
    const query = `
      UPDATE maestro.incidents
      SET acknowledged_at = NOW(), status = 'investigating', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  async resolveIncident(
    id: string,
    rootCause?: string
  ): Promise<Incident | null> {
    const query = `
      UPDATE maestro.incidents
      SET resolved_at = NOW(), status = 'resolved', root_cause = COALESCE($2, root_cause), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id, rootCause]);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  async closeIncident(id: string): Promise<Incident | null> {
    const query = `
      UPDATE maestro.incidents
      SET closed_at = NOW(), status = 'closed', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  async linkToGithub(
    id: string,
    githubIssueUrl: string,
    githubIssueNumber: number
  ): Promise<Incident | null> {
    const query = `
      UPDATE maestro.incidents
      SET github_issue_url = $2, github_issue_number = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [
      id,
      githubIssueUrl,
      githubIssueNumber,
    ]);
    return result.rows[0] ? this.mapRowToIncident(result.rows[0]) : null;
  }

  private mapRowToIncident(row: any): Incident {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      affectedServices: row.affected_services,
      startedAt: row.started_at,
      detectedAt: row.detected_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      commander: row.commander,
      responders: row.responders,
      githubIssueUrl: row.github_issue_url,
      githubIssueNumber: row.github_issue_number,
      slackChannel: row.slack_channel,
      rootCause: row.root_cause,
      impactDescription: row.impact_description,
      customerImpact: row.customer_impact,
      estimatedAffectedUsers: row.estimated_affected_users,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
