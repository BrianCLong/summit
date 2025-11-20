/**
 * Deployment Service
 * Business logic for deployment tracking
 */

import { Pool } from 'pg';
import {
  Deployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
  DeploymentFilter,
  DeploymentStatus,
  DeploymentStats,
  DeploymentEnvironment,
} from '../models/deployment';

export class DeploymentService {
  constructor(private db: Pool) {}

  async createDeployment(input: CreateDeploymentInput): Promise<Deployment> {
    const query = `
      INSERT INTO maestro.deployments (
        service_name, version, environment, deployment_type, deployed_by,
        commit_sha, github_run_id, github_run_url, github_release_url, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      input.serviceName,
      input.version,
      input.environment,
      input.deploymentType || 'standard',
      input.deployedBy,
      input.commitSha,
      input.githubRunId,
      input.githubRunUrl,
      input.githubReleaseUrl,
      JSON.stringify(input.metadata || {}),
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToDeployment(result.rows[0]);
  }

  async getDeployment(id: string): Promise<Deployment | null> {
    const query = `SELECT * FROM maestro.deployments WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToDeployment(result.rows[0]) : null;
  }

  async listDeployments(
    filter?: DeploymentFilter,
    limit = 25,
    offset = 0
  ): Promise<Deployment[]> {
    let query = `SELECT * FROM maestro.deployments WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filter) {
      if (filter.serviceName) {
        query += ` AND service_name = $${paramIndex++}`;
        values.push(filter.serviceName);
      }
      if (filter.environment) {
        query += ` AND environment = $${paramIndex++}`;
        values.push(filter.environment);
      }
      if (filter.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filter.status);
      }
      if (filter.deployedBy) {
        query += ` AND deployed_by = $${paramIndex++}`;
        values.push(filter.deployedBy);
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
    return result.rows.map((row) => this.mapRowToDeployment(row));
  }

  async getDeploymentStats(
    serviceName?: string,
    environment?: DeploymentEnvironment,
    days = 30
  ): Promise<DeploymentStats[]> {
    let query = `
      SELECT * FROM maestro.recent_deployments_view
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (serviceName) {
      query += ` AND service_name = $${paramIndex++}`;
      values.push(serviceName);
    }
    if (environment) {
      query += ` AND environment = $${paramIndex++}`;
      values.push(environment);
    }

    const result = await this.db.query(query, values);
    return result.rows.map((row) => ({
      serviceName: row.service_name,
      environment: row.environment,
      totalDeployments: parseInt(row.total_deployments),
      successfulDeployments: parseInt(row.successful_deployments),
      failedDeployments: parseInt(row.failed_deployments),
      rolledBackDeployments: parseInt(row.rolled_back_deployments),
      successRate: parseFloat(row.success_rate),
      avgDurationSeconds: row.avg_duration_seconds
        ? parseFloat(row.avg_duration_seconds)
        : undefined,
      lastDeploymentAt: row.last_deployment_at,
    }));
  }

  async updateDeployment(
    id: string,
    input: UpdateDeploymentInput
  ): Promise<Deployment | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);

      // Auto-set completed_at if status is terminal
      if (
        ['succeeded', 'failed', 'rolled_back', 'cancelled'].includes(
          input.status
        )
      ) {
        updates.push(`completed_at = NOW()`);
      }
    }
    if (input.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(input.completedAt);
    }
    if (input.durationSeconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      values.push(input.durationSeconds);
    }
    if (input.healthCheckStatus !== undefined) {
      updates.push(`health_check_status = $${paramIndex++}`);
      values.push(input.healthCheckStatus);
    }
    if (input.smokeTestStatus !== undefined) {
      updates.push(`smoke_test_status = $${paramIndex++}`);
      values.push(input.smokeTestStatus);
    }
    if (input.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(input.errorMessage);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return this.getDeployment(id);
    }

    const query = `
      UPDATE maestro.deployments
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.mapRowToDeployment(result.rows[0]) : null;
  }

  async markSucceeded(id: string): Promise<Deployment | null> {
    return this.updateDeployment(id, {
      status: DeploymentStatus.SUCCEEDED,
    });
  }

  async markFailed(
    id: string,
    errorMessage: string
  ): Promise<Deployment | null> {
    return this.updateDeployment(id, {
      status: DeploymentStatus.FAILED,
      errorMessage,
    });
  }

  async createRollback(
    originalDeploymentId: string,
    rolledBackBy: string
  ): Promise<Deployment | null> {
    // Get original deployment details
    const original = await this.getDeployment(originalDeploymentId);
    if (!original) {
      return null;
    }

    // Create a rollback deployment
    const rollbackDeployment = await this.createDeployment({
      serviceName: original.serviceName,
      version: 'rollback',
      environment: original.environment,
      deploymentType: 'standard',
      deployedBy: rolledBackBy,
      metadata: {
        rollbackOf: originalDeploymentId,
        originalVersion: original.version,
      },
    });

    // Update original deployment status
    await this.updateDeployment(originalDeploymentId, {
      status: DeploymentStatus.ROLLED_BACK,
    });

    // Link rollback
    await this.db.query(
      `UPDATE maestro.deployments SET rollback_of_deployment_id = $1 WHERE id = $2`,
      [originalDeploymentId, rollbackDeployment.id]
    );

    return rollbackDeployment;
  }

  private mapRowToDeployment(row: any): Deployment {
    return {
      id: row.id,
      serviceName: row.service_name,
      version: row.version,
      environment: row.environment,
      status: row.status,
      deploymentType: row.deployment_type,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      deployedBy: row.deployed_by,
      commitSha: row.commit_sha,
      githubRunId: row.github_run_id,
      githubRunUrl: row.github_run_url,
      githubReleaseUrl: row.github_release_url,
      rollbackOfDeploymentId: row.rollback_of_deployment_id,
      healthCheckStatus: row.health_check_status,
      smokeTestStatus: row.smoke_test_status,
      errorMessage: row.error_message,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
