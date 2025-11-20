/**
 * SLA Management System
 * Tracks SLA compliance, monitors breaches, and calculates credits
 */

import { Pool } from 'pg';
import { Logger } from 'pino';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { differenceInMinutes, addMinutes, isWithinInterval } from 'date-fns';

export interface SLAMetrics {
  tenantId: string;
  period: { start: Date; end: Date };
  totalTickets: number;
  responseCompliance: number;
  resolutionCompliance: number;
  totalBreaches: number;
  responseBreaches: number;
  resolutionBreaches: number;
  averageResponseTimeMinutes: number;
  averageResolutionTimeMinutes: number;
  creditAmount: number;
}

export class SLAManagementService {
  private pool: Pool;
  private redis: Redis;
  private slaQueue: Queue;
  private logger: Logger;

  constructor(pool: Pool, redis: Redis, logger: Logger) {
    this.pool = pool;
    this.redis = redis;
    this.logger = logger.child({ service: 'SLAManagementService' });

    this.slaQueue = new Queue('sla-monitoring', { connection: redis });
    this.initializeWorkers();
  }

  /**
   * Monitor SLA compliance for a ticket
   */
  async monitorTicketSLA(ticketId: string): Promise<void> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      this.logger.warn({ ticketId }, 'Ticket not found for SLA monitoring');
      return;
    }

    const now = new Date();

    // Check response SLA
    if (!ticket.firstResponseAt && ticket.responseDueAt) {
      if (now >= ticket.responseDueAt) {
        await this.recordBreach(ticketId, 'response', ticket.responseDueAt, ticket.slaTier);
      }
    }

    // Check resolution SLA
    if (!ticket.resolvedAt && ticket.resolutionDueAt) {
      if (now >= ticket.resolutionDueAt) {
        await this.recordBreach(ticketId, 'resolution', ticket.resolutionDueAt, ticket.slaTier);
      }
    }
  }

  /**
   * Calculate SLA compliance metrics for a period
   */
  async calculateSLAMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<SLAMetrics> {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE first_response_at <= response_due_at) as response_compliant,
        COUNT(*) FILTER (WHERE resolved_at <= resolution_due_at) as resolution_compliant,
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.breach_type = 'response') as response_breaches,
        COUNT(DISTINCT sb.id) FILTER (WHERE sb.breach_type = 'resolution') as resolution_breaches,
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_response_time,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_resolution_time,
        COALESCE(SUM(sb.credit_amount), 0) as total_credits
      FROM support_tickets st
      LEFT JOIN sla_breaches sb ON st.id = sb.ticket_id
      WHERE st.tenant_id = $1 AND st.created_at BETWEEN $2 AND $3`,
      [tenantId, startDate, endDate]
    );

    const row = result.rows[0];
    const totalTickets = parseInt(row.total_tickets) || 0;

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      totalTickets,
      responseCompliance: totalTickets > 0 ? (parseInt(row.response_compliant) / totalTickets) * 100 : 100,
      resolutionCompliance: totalTickets > 0 ? (parseInt(row.resolution_compliant) / totalTickets) * 100 : 100,
      totalBreaches: (parseInt(row.response_breaches) || 0) + (parseInt(row.resolution_breaches) || 0),
      responseBreaches: parseInt(row.response_breaches) || 0,
      resolutionBreaches: parseInt(row.resolution_breaches) || 0,
      averageResponseTimeMinutes: parseFloat(row.avg_response_time) || 0,
      averageResolutionTimeMinutes: parseFloat(row.avg_resolution_time) || 0,
      creditAmount: parseFloat(row.total_credits) || 0
    };
  }

  /**
   * Calculate uptime percentage for a component
   */
  async calculateUptime(componentId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.pool.query(
      `SELECT AVG(uptime_percentage) as avg_uptime
       FROM uptime_records
       WHERE component_id = $1 AND date BETWEEN $2 AND $3`,
      [componentId, startDate, endDate]
    );

    return parseFloat(result.rows[0]?.avg_uptime) || 100;
  }

  /**
   * Record daily uptime metrics
   */
  async recordDailyUptime(componentId: string, date: Date, uptimePercentage: number, downtimeMinutes: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO uptime_records (component_id, date, uptime_percentage, downtime_minutes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (component_id, date) DO UPDATE
       SET uptime_percentage = $3, downtime_minutes = $4`,
      [componentId, date, uptimePercentage, downtimeMinutes]
    );
  }

  /**
   * Get SLA breaches for a tenant
   */
  async getSLABreaches(tenantId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT sb.*, st.ticket_number, st.subject, st.customer_email
       FROM sla_breaches sb
       JOIN support_tickets st ON sb.ticket_id = st.id
       WHERE st.tenant_id = $1 AND sb.created_at BETWEEN $2 AND $3
       ORDER BY sb.created_at DESC`,
      [tenantId, startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Acknowledge SLA breach
   */
  async acknowledgeBreach(breachId: string, userId: string, justification?: string): Promise<void> {
    await this.pool.query(
      `UPDATE sla_breaches
       SET is_acknowledged = true, acknowledged_by = $2, acknowledged_at = NOW(), justification = $3
       WHERE id = $1`,
      [breachId, userId, justification]
    );

    this.logger.info({ breachId, userId }, 'SLA breach acknowledged');
  }

  /**
   * Apply SLA credit
   */
  async applyCredit(breachId: string, creditAmount: number): Promise<void> {
    await this.pool.query(
      `UPDATE sla_breaches
       SET credit_applied = true, credit_amount = $2
       WHERE id = $1`,
      [breachId, creditAmount]
    );

    this.logger.info({ breachId, creditAmount }, 'SLA credit applied');
  }

  /**
   * Schedule SLA monitoring for a ticket
   */
  async scheduleSLAMonitoring(ticketId: string, responseDueAt: Date, resolutionDueAt: Date): Promise<void> {
    // Schedule response SLA check
    if (responseDueAt) {
      const delay = Math.max(0, responseDueAt.getTime() - Date.now());
      await this.slaQueue.add('check-response-sla', { ticketId }, { delay });
    }

    // Schedule resolution SLA check
    if (resolutionDueAt) {
      const delay = Math.max(0, resolutionDueAt.getTime() - Date.now());
      await this.slaQueue.add('check-resolution-sla', { ticketId }, { delay });
    }

    // Schedule periodic checks every hour
    await this.slaQueue.add(
      'periodic-sla-check',
      { ticketId },
      { repeat: { every: 3600000 } } // Every hour
    );
  }

  /**
   * Record SLA breach
   */
  private async recordBreach(
    ticketId: string,
    breachType: 'response' | 'resolution',
    targetTime: Date,
    slaTier: string
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if breach already recorded
      const existing = await client.query(
        'SELECT id FROM sla_breaches WHERE ticket_id = $1 AND breach_type = $2',
        [ticketId, breachType]
      );

      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return;
      }

      // Get SLA definition
      const slaResult = await client.query(
        `SELECT id, credit_percentage_per_breach
         FROM sla_definitions sd
         JOIN support_tickets st ON st.tenant_id = sd.tenant_id
         WHERE st.id = $1 AND sd.tier = $2 AND sd.is_active = true`,
        [ticketId, slaTier]
      );

      if (slaResult.rows.length === 0) {
        this.logger.warn({ ticketId, slaTier }, 'No active SLA definition found');
        await client.query('COMMIT');
        return;
      }

      const sla = slaResult.rows[0];
      const now = new Date();
      const breachMinutes = differenceInMinutes(now, targetTime);

      // Record breach
      await client.query(
        `INSERT INTO sla_breaches (ticket_id, sla_definition_id, breach_type, target_time, breach_minutes)
         VALUES ($1, $2, $3, $4, $5)`,
        [ticketId, sla.id, breachType, targetTime, breachMinutes]
      );

      await client.query('COMMIT');

      this.logger.warn({ ticketId, breachType, breachMinutes }, 'SLA breach recorded');

      // Queue notification
      await this.slaQueue.add('breach-notification', {
        ticketId,
        breachType,
        breachMinutes
      });
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, ticketId, breachType }, 'Failed to record SLA breach');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get ticket information
   */
  private async getTicket(ticketId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT id, response_due_at, resolution_due_at, first_response_at, resolved_at, sla_tier
       FROM support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      responseDueAt: row.response_due_at,
      resolutionDueAt: row.resolution_due_at,
      firstResponseAt: row.first_response_at,
      resolvedAt: row.resolved_at,
      slaTier: row.sla_tier
    };
  }

  /**
   * Initialize background workers
   */
  private initializeWorkers(): void {
    new Worker('sla-monitoring', async (job) => {
      const { ticketId } = job.data;

      switch (job.name) {
        case 'check-response-sla':
        case 'check-resolution-sla':
        case 'periodic-sla-check':
          await this.monitorTicketSLA(ticketId);
          break;
        case 'breach-notification':
          this.logger.info({ job: job.data }, 'SLA breach notification');
          // Send notifications to stakeholders
          break;
      }
    }, { connection: this.redis });
  }
}

export * from './index';
