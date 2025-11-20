/**
 * Health Monitoring System
 * Monitors system health, manages incidents, and provides status page
 */

import { Pool } from 'pg';
import { Logger } from 'pino';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import axios from 'axios';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE';
export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED' | 'POST_MORTEM';

export interface ServiceComponent {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  componentType?: string;
  parentId?: string;
  isCritical: boolean;
  healthCheckUrl?: string;
  healthCheckInterval: number;
  createdAt: Date;
}

export interface HealthCheck {
  id: string;
  componentId: string;
  status: HealthStatus;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: any;
  checkedAt: Date;
}

export interface SystemIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedComponents: string[];
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  rootCause?: string;
  resolution?: string;
  createdBy?: string;
  assignedTo?: string;
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  isPublic: boolean;
  createdBy?: string;
  createdAt: Date;
}

export class HealthMonitoringService {
  private pool: Pool;
  private redis: Redis;
  private healthCheckQueue: Queue;
  private logger: Logger;

  constructor(pool: Pool, redis: Redis, logger: Logger) {
    this.pool = pool;
    this.redis = redis;
    this.logger = logger.child({ service: 'HealthMonitoringService' });

    this.healthCheckQueue = new Queue('health-checks', { connection: redis });
    this.initializeWorkers();
    this.scheduleHealthChecks();
  }

  /**
   * Register a service component for monitoring
   */
  async registerComponent(
    name: string,
    displayName: string,
    isCritical: boolean,
    healthCheckUrl?: string,
    healthCheckInterval = 60
  ): Promise<ServiceComponent> {
    const result = await this.pool.query(
      `INSERT INTO service_components (name, display_name, is_critical, health_check_url, health_check_interval_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO UPDATE
       SET display_name = $2, is_critical = $3, health_check_url = $4, health_check_interval_seconds = $5
       RETURNING *`,
      [name, displayName, isCritical, healthCheckUrl, healthCheckInterval]
    );

    const component = this.mapRowToComponent(result.rows[0]);

    // Schedule health checks
    if (healthCheckUrl) {
      await this.scheduleComponentHealthCheck(component.id, healthCheckInterval);
    }

    this.logger.info({ componentId: component.id, name }, 'Component registered');
    return component;
  }

  /**
   * Perform health check on a component
   */
  async performHealthCheck(componentId: string): Promise<HealthCheck> {
    const component = await this.getComponent(componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    let status: HealthStatus = 'HEALTHY';
    let responseTimeMs: number | undefined;
    let errorMessage: string | undefined;

    if (component.healthCheckUrl) {
      const startTime = Date.now();
      try {
        const response = await axios.get(component.healthCheckUrl, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        responseTimeMs = Date.now() - startTime;

        if (response.status >= 200 && response.status < 300) {
          status = 'HEALTHY';
        } else if (response.status >= 300 && response.status < 500) {
          status = 'DEGRADED';
          errorMessage = `HTTP ${response.status}`;
        } else {
          status = 'DOWN';
          errorMessage = `HTTP ${response.status}`;
        }
      } catch (error: any) {
        responseTimeMs = Date.now() - startTime;
        status = 'DOWN';
        errorMessage = error.message;
      }
    }

    // Record health check
    const result = await this.pool.query(
      `INSERT INTO service_health_checks (component_id, status, response_time_ms, error_message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [componentId, status, responseTimeMs, errorMessage]
    );

    const healthCheck = this.mapRowToHealthCheck(result.rows[0]);

    // Cache current status in Redis
    await this.redis.setex(`health:${componentId}`, 300, status);

    // Detect incidents
    if (status === 'DOWN' && component.isCritical) {
      await this.detectIncident(component, status, errorMessage);
    }

    return healthCheck;
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<{
    status: HealthStatus;
    components: Array<{ component: ServiceComponent; latestCheck: HealthCheck | null }>;
  }> {
    const components = await this.getAllComponents();
    const componentHealth = await Promise.all(
      components.map(async (component) => {
        const latestCheck = await this.getLatestHealthCheck(component.id);
        return { component, latestCheck };
      })
    );

    // Determine overall status
    const statuses = componentHealth
      .filter(ch => ch.component.isCritical && ch.latestCheck)
      .map(ch => ch.latestCheck!.status);

    let overallStatus: HealthStatus = 'HEALTHY';
    if (statuses.includes('DOWN')) {
      overallStatus = 'DOWN';
    } else if (statuses.includes('DEGRADED')) {
      overallStatus = 'DEGRADED';
    } else if (statuses.includes('MAINTENANCE')) {
      overallStatus = 'MAINTENANCE';
    }

    return {
      status: overallStatus,
      components: componentHealth
    };
  }

  /**
   * Create a new incident
   */
  async createIncident(
    title: string,
    severity: IncidentSeverity,
    affectedComponents: string[],
    description?: string,
    createdBy?: string
  ): Promise<SystemIncident> {
    const incidentNumber = await this.generateIncidentNumber();

    const result = await this.pool.query(
      `INSERT INTO system_incidents (incident_number, title, description, severity, affected_components, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [incidentNumber, title, description, severity, affectedComponents, createdBy]
    );

    const incident = this.mapRowToIncident(result.rows[0]);

    this.logger.warn({ incidentId: incident.id, incidentNumber, severity }, 'Incident created');

    // Notify subscribers
    await this.notifySubscribers(incident);

    return incident;
  }

  /**
   * Add update to incident
   */
  async addIncidentUpdate(
    incidentId: string,
    status: IncidentStatus,
    message: string,
    isPublic = true,
    createdBy?: string
  ): Promise<IncidentUpdate> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update incident status
      await client.query(
        'UPDATE system_incidents SET status = $1 WHERE id = $2',
        [status, incidentId]
      );

      // Add update
      const result = await client.query(
        `INSERT INTO incident_updates (incident_id, status, message, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [incidentId, status, message, isPublic, createdBy]
      );

      await client.query('COMMIT');

      this.logger.info({ incidentId, status }, 'Incident updated');

      return this.mapRowToIncidentUpdate(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resolve incident
   */
  async resolveIncident(incidentId: string, resolution: string, rootCause?: string): Promise<void> {
    await this.pool.query(
      `UPDATE system_incidents
       SET status = 'RESOLVED', resolved_at = NOW(), resolution = $2, root_cause = $3
       WHERE id = $1`,
      [incidentId, resolution, rootCause]
    );

    this.logger.info({ incidentId }, 'Incident resolved');
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents(): Promise<SystemIncident[]> {
    const result = await this.pool.query(
      `SELECT * FROM system_incidents
       WHERE status NOT IN ('RESOLVED', 'POST_MORTEM')
       ORDER BY severity, detected_at DESC`
    );

    return result.rows.map(row => this.mapRowToIncident(row));
  }

  /**
   * Get incident history
   */
  async getIncidentHistory(limit = 50): Promise<SystemIncident[]> {
    const result = await this.pool.query(
      `SELECT * FROM system_incidents
       ORDER BY detected_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.mapRowToIncident(row));
  }

  /**
   * Subscribe to status updates
   */
  async subscribeToUpdates(email: string, componentIds?: string[]): Promise<void> {
    await this.pool.query(
      `INSERT INTO status_page_subscriptions (email, component_ids)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET component_ids = $2`,
      [email, componentIds || []]
    );

    this.logger.info({ email }, 'User subscribed to status updates');
  }

  /**
   * Schedule health checks for a component
   */
  private async scheduleComponentHealthCheck(componentId: string, intervalSeconds: number): Promise<void> {
    await this.healthCheckQueue.add(
      'health-check',
      { componentId },
      {
        repeat: {
          every: intervalSeconds * 1000
        }
      }
    );
  }

  /**
   * Schedule health checks for all components
   */
  private async scheduleHealthChecks(): Promise<void> {
    const components = await this.getAllComponents();

    for (const component of components) {
      if (component.healthCheckUrl) {
        await this.scheduleComponentHealthCheck(component.id, component.healthCheckInterval);
      }
    }
  }

  /**
   * Detect and create incident based on health check failures
   */
  private async detectIncident(
    component: ServiceComponent,
    status: HealthStatus,
    errorMessage?: string
  ): Promise<void> {
    // Check if there's already an active incident for this component
    const existingResult = await this.pool.query(
      `SELECT id FROM system_incidents
       WHERE $1 = ANY(affected_components)
       AND status NOT IN ('RESOLVED', 'POST_MORTEM')
       LIMIT 1`,
      [component.id]
    );

    if (existingResult.rows.length === 0) {
      // Create new incident
      await this.createIncident(
        `${component.displayName} is ${status.toLowerCase()}`,
        'P1',
        [component.id],
        errorMessage
      );
    }
  }

  /**
   * Notify subscribers about incident
   */
  private async notifySubscribers(incident: SystemIncident): Promise<void> {
    const result = await this.pool.query(
      `SELECT email FROM status_page_subscriptions
       WHERE notify_on_incidents = true
       AND (component_ids = '{}' OR component_ids && $1)`,
      [incident.affectedComponents]
    );

    // Queue email notifications
    for (const row of result.rows) {
      this.logger.info({ email: row.email, incidentId: incident.id }, 'Queuing incident notification');
      // Queue notification job
    }
  }

  /**
   * Generate unique incident number
   */
  private async generateIncidentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM system_incidents
       WHERE incident_number LIKE $1`,
      [`INC-${year}-%`]
    );

    const count = parseInt(result.rows[0].count) + 1;
    return `INC-${year}-${String(count).padStart(4, '0')}`;
  }

  /**
   * Get component by ID
   */
  private async getComponent(componentId: string): Promise<ServiceComponent | null> {
    const result = await this.pool.query(
      'SELECT * FROM service_components WHERE id = $1',
      [componentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToComponent(result.rows[0]);
  }

  /**
   * Get all components
   */
  private async getAllComponents(): Promise<ServiceComponent[]> {
    const result = await this.pool.query('SELECT * FROM service_components ORDER BY name');
    return result.rows.map(row => this.mapRowToComponent(row));
  }

  /**
   * Get latest health check for component
   */
  private async getLatestHealthCheck(componentId: string): Promise<HealthCheck | null> {
    const result = await this.pool.query(
      'SELECT * FROM service_health_checks WHERE component_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [componentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToHealthCheck(result.rows[0]);
  }

  /**
   * Initialize background workers
   */
  private initializeWorkers(): void {
    new Worker('health-checks', async (job) => {
      if (job.name === 'health-check') {
        const { componentId } = job.data;
        try {
          await this.performHealthCheck(componentId);
        } catch (error) {
          this.logger.error({ error, componentId }, 'Health check failed');
        }
      }
    }, { connection: this.redis });
  }

  private mapRowToComponent(row: any): ServiceComponent {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      componentType: row.component_type,
      parentId: row.parent_id,
      isCritical: row.is_critical,
      healthCheckUrl: row.health_check_url,
      healthCheckInterval: row.health_check_interval_seconds,
      createdAt: row.created_at
    };
  }

  private mapRowToHealthCheck(row: any): HealthCheck {
    return {
      id: row.id,
      componentId: row.component_id,
      status: row.status,
      responseTimeMs: row.response_time_ms,
      errorMessage: row.error_message,
      metadata: row.metadata,
      checkedAt: row.checked_at
    };
  }

  private mapRowToIncident(row: any): SystemIncident {
    return {
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      affectedComponents: row.affected_components,
      detectedAt: row.detected_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      rootCause: row.root_cause,
      resolution: row.resolution,
      createdBy: row.created_by,
      assignedTo: row.assigned_to
    };
  }

  private mapRowToIncidentUpdate(row: any): IncidentUpdate {
    return {
      id: row.id,
      incidentId: row.incident_id,
      status: row.status,
      message: row.message,
      isPublic: row.is_public,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }
}

export * from './index';
