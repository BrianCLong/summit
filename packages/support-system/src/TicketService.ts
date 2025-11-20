/**
 * Enterprise Support System - Ticket Service
 * Handles ticket lifecycle, assignment, SLA tracking, and escalation
 */

import { Pool, PoolClient } from 'pg';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { addMinutes, differenceInMinutes, isAfter } from 'date-fns';
import {
  SupportTicket,
  CreateTicketInput,
  UpdateTicketInput,
  TicketSearchFilters,
  TicketStatus,
  TicketSeverity,
  SLATier,
  SLADefinition,
  SLABreach,
  EscalationRule,
  TicketComment,
  TicketHistoryEntry
} from './types';

export class TicketService {
  private pool: Pool;
  private redis: Redis;
  private ticketQueue: Queue;
  private escalationQueue: Queue;
  private logger: Logger;

  constructor(
    pool: Pool,
    redis: Redis,
    logger: Logger
  ) {
    this.pool = pool;
    this.redis = redis;
    this.logger = logger.child({ service: 'TicketService' });

    // Initialize job queues
    this.ticketQueue = new Queue('support-tickets', { connection: redis });
    this.escalationQueue = new Queue('ticket-escalations', { connection: redis });

    this.initializeWorkers();
  }

  /**
   * Create a new support ticket
   */
  async createTicket(input: CreateTicketInput, userId?: string): Promise<SupportTicket> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber(client);

      // Get SLA definition for the tenant and tier
      const sla = await this.getSLADefinition(client, input.tenantId, input.slaTier || SLATier.BASIC);

      // Calculate SLA due dates
      const now = new Date();
      const responseDueAt = this.calculateSLADueDate(now, input.severity || TicketSeverity.SEV3, sla, 'response');
      const resolutionDueAt = this.calculateSLADueDate(now, input.severity || TicketSeverity.SEV3, sla, 'resolution');

      // Insert ticket
      const result = await client.query(
        `INSERT INTO support_tickets (
          tenant_id, ticket_number, customer_email, customer_name, customer_phone,
          organization, subject, description, priority, severity, channel,
          sla_tier, response_due_at, resolution_due_at, category, subcategory,
          product, version, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          input.tenantId,
          ticketNumber,
          input.customerEmail,
          input.customerName,
          input.customerPhone,
          input.organization,
          input.subject,
          input.description,
          input.priority || 'MEDIUM',
          input.severity || 'SEV3',
          input.channel || 'PORTAL',
          input.slaTier || 'BASIC',
          responseDueAt,
          resolutionDueAt,
          input.category,
          input.subcategory,
          input.product,
          input.version,
          input.tags || [],
          userId
        ]
      );

      const ticket = this.mapRowToTicket(result.rows[0]);

      // Create history entry
      await this.createHistoryEntry(client, ticket.id, userId, 'created', null, 'Ticket created');

      await client.query('COMMIT');

      // Queue async tasks
      await this.ticketQueue.add('ticket-created', {
        ticketId: ticket.id,
        tenantId: ticket.tenantId
      });

      // Schedule SLA monitoring
      await this.scheduleSLAMonitoring(ticket);

      // Auto-assign if rules exist
      await this.autoAssignTicket(ticket);

      this.logger.info({ ticketId: ticket.id, ticketNumber }, 'Ticket created');

      return ticket;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, input }, 'Failed to create ticket');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing ticket
   */
  async updateTicket(
    ticketId: string,
    updates: UpdateTicketInput,
    userId?: string
  ): Promise<SupportTicket> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current ticket
      const currentResult = await client.query(
        'SELECT * FROM support_tickets WHERE id = $1',
        [ticketId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Ticket not found');
      }

      const current = this.mapRowToTicket(currentResult.rows[0]);

      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);

        // Track resolution/closure times
        if (updates.status === TicketStatus.RESOLVED && !current.resolvedAt) {
          updateFields.push(`resolved_at = $${paramIndex++}`);
          values.push(new Date());
        }
        if (updates.status === TicketStatus.CLOSED && !current.closedAt) {
          updateFields.push(`closed_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }

      if (updates.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }

      if (updates.severity !== undefined) {
        updateFields.push(`severity = $${paramIndex++}`);
        values.push(updates.severity);
      }

      if (updates.assignedTo !== undefined) {
        updateFields.push(`assigned_to = $${paramIndex++}`);
        values.push(updates.assignedTo);
      }

      if (updates.assignedTeam !== undefined) {
        updateFields.push(`assigned_team = $${paramIndex++}`);
        values.push(updates.assignedTeam);
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(updates.tags);
      }

      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.subcategory !== undefined) {
        updateFields.push(`subcategory = $${paramIndex++}`);
        values.push(updates.subcategory);
      }

      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(userId);

      updateFields.push(`updated_at = NOW()`);

      values.push(ticketId);

      const result = await client.query(
        `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updated = this.mapRowToTicket(result.rows[0]);

      // Create history entries for changes
      for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = (current as any)[field];
        if (oldValue !== newValue) {
          await this.createHistoryEntry(
            client,
            ticketId,
            userId,
            `${field}_change`,
            String(oldValue),
            String(newValue)
          );
        }
      }

      await client.query('COMMIT');

      this.logger.info({ ticketId, updates }, 'Ticket updated');

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, ticketId, updates }, 'Failed to update ticket');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(
    ticketId: string,
    userId: string,
    content: string,
    isInternal = false,
    isSolution = false
  ): Promise<TicketComment> {
    const client = await this.pool.connect();

    try {
      // Check if this is the first response
      const ticketResult = await client.query(
        'SELECT first_response_at FROM support_tickets WHERE id = $1',
        [ticketId]
      );

      const ticket = ticketResult.rows[0];
      const isFirstResponse = !ticket?.first_response_at && !isInternal;

      await client.query('BEGIN');

      // Insert comment
      const result = await client.query(
        `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal, is_solution)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ticketId, userId, content, isInternal, isSolution]
      );

      // Update first response time if applicable
      if (isFirstResponse) {
        await client.query(
          'UPDATE support_tickets SET first_response_at = NOW() WHERE id = $1',
          [ticketId]
        );
      }

      // If marked as solution, update ticket status
      if (isSolution) {
        await client.query(
          'UPDATE support_tickets SET status = $1 WHERE id = $2',
          [TicketStatus.RESOLVED, ticketId]
        );
      }

      await client.query('COMMIT');

      const comment: TicketComment = {
        id: result.rows[0].id,
        ticketId: result.rows[0].ticket_id,
        userId: result.rows[0].user_id,
        content: result.rows[0].content,
        isInternal: result.rows[0].is_internal,
        isSolution: result.rows[0].is_solution,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };

      this.logger.info({ ticketId, commentId: comment.id }, 'Comment added');

      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, ticketId }, 'Failed to add comment');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search tickets with filters
   */
  async searchTickets(filters: TicketSearchFilters, limit = 50, offset = 0): Promise<SupportTicket[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(filters.tenantId);
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      values.push(filters.status);
    }

    if (filters.priority && filters.priority.length > 0) {
      conditions.push(`priority = ANY($${paramIndex++})`);
      values.push(filters.priority);
    }

    if (filters.severity && filters.severity.length > 0) {
      conditions.push(`severity = ANY($${paramIndex++})`);
      values.push(filters.severity);
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }

    if (filters.assignedTeam) {
      conditions.push(`assigned_team = $${paramIndex++}`);
      values.push(filters.assignedTeam);
    }

    if (filters.customerEmail) {
      conditions.push(`customer_email = $${paramIndex++}`);
      values.push(filters.customerEmail);
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(filters.tags);
    }

    if (filters.createdAfter) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.createdAfter);
    }

    if (filters.createdBefore) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.createdBefore);
    }

    if (filters.isOverdue) {
      conditions.push(`(
        (status IN ('NEW', 'OPEN', 'IN_PROGRESS') AND resolution_due_at < NOW()) OR
        (first_response_at IS NULL AND response_due_at < NOW())
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM support_tickets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToTicket(row));
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    const result = await this.pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [ticketId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  /**
   * Get ticket metrics
   */
  async getTicketMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status IN ('NEW', 'OPEN', 'IN_PROGRESS')) as open_tickets,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_tickets,
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_response_time_minutes,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes,
        AVG(satisfaction_rating) as avg_satisfaction_score
      FROM support_tickets
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
      [tenantId, startDate, endDate]
    );

    return result.rows[0];
  }

  /**
   * Check and handle SLA breaches
   */
  private async checkSLABreaches(ticket: SupportTicket): Promise<void> {
    const now = new Date();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check response SLA
      if (!ticket.firstResponseAt && ticket.responseDueAt && isAfter(now, ticket.responseDueAt)) {
        await this.recordSLABreach(client, ticket, 'response');
      }

      // Check resolution SLA
      if (!ticket.resolvedAt && ticket.resolutionDueAt && isAfter(now, ticket.resolutionDueAt)) {
        await this.recordSLABreach(client, ticket, 'resolution');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record SLA breach
   */
  private async recordSLABreach(
    client: PoolClient,
    ticket: SupportTicket,
    breachType: 'response' | 'resolution'
  ): Promise<void> {
    const now = new Date();
    const targetTime = breachType === 'response' ? ticket.responseDueAt! : ticket.resolutionDueAt!;
    const breachMinutes = differenceInMinutes(now, targetTime);

    // Check if breach already recorded
    const existing = await client.query(
      'SELECT id FROM sla_breaches WHERE ticket_id = $1 AND breach_type = $2',
      [ticket.id, breachType]
    );

    if (existing.rows.length === 0) {
      const slaResult = await client.query(
        'SELECT id FROM sla_definitions WHERE tenant_id = $1 AND tier = $2 AND is_active = true',
        [ticket.tenantId, ticket.slaTier]
      );

      if (slaResult.rows.length > 0) {
        await client.query(
          `INSERT INTO sla_breaches (ticket_id, sla_definition_id, breach_type, target_time, breach_minutes)
           VALUES ($1, $2, $3, $4, $5)`,
          [ticket.id, slaResult.rows[0].id, breachType, targetTime, breachMinutes]
        );

        // Queue escalation
        await this.escalationQueue.add('sla-breach', {
          ticketId: ticket.id,
          breachType,
          breachMinutes
        });

        this.logger.warn({ ticketId: ticket.id, breachType, breachMinutes }, 'SLA breach detected');
      }
    }
  }

  /**
   * Auto-assign ticket based on rules
   */
  private async autoAssignTicket(ticket: SupportTicket): Promise<void> {
    // Implementation would query assignment rules and assign to appropriate agent/team
    // This is a placeholder for the auto-assignment logic
    this.logger.debug({ ticketId: ticket.id }, 'Auto-assignment check');
  }

  /**
   * Schedule SLA monitoring for ticket
   */
  private async scheduleSLAMonitoring(ticket: SupportTicket): Promise<void> {
    if (ticket.responseDueAt) {
      await this.ticketQueue.add(
        'check-sla',
        { ticketId: ticket.id, checkType: 'response' },
        { delay: ticket.responseDueAt.getTime() - Date.now() }
      );
    }

    if (ticket.resolutionDueAt) {
      await this.ticketQueue.add(
        'check-sla',
        { ticketId: ticket.id, checkType: 'resolution' },
        { delay: ticket.resolutionDueAt.getTime() - Date.now() }
      );
    }
  }

  /**
   * Calculate SLA due date based on severity and SLA definition
   */
  private calculateSLADueDate(
    from: Date,
    severity: TicketSeverity,
    sla: SLADefinition,
    type: 'response' | 'resolution'
  ): Date {
    let minutes: number;

    if (type === 'response') {
      switch (severity) {
        case TicketSeverity.SEV1:
          minutes = sla.sev1ResponseMinutes;
          break;
        case TicketSeverity.SEV2:
          minutes = sla.sev2ResponseMinutes;
          break;
        case TicketSeverity.SEV3:
          minutes = sla.sev3ResponseMinutes;
          break;
        case TicketSeverity.SEV4:
          minutes = sla.sev4ResponseMinutes;
          break;
      }
    } else {
      switch (severity) {
        case TicketSeverity.SEV1:
          minutes = sla.sev1ResolutionMinutes;
          break;
        case TicketSeverity.SEV2:
          minutes = sla.sev2ResolutionMinutes;
          break;
        case TicketSeverity.SEV3:
          minutes = sla.sev3ResolutionMinutes;
          break;
        case TicketSeverity.SEV4:
          minutes = sla.sev4ResolutionMinutes;
          break;
      }
    }

    return addMinutes(from, minutes);
  }

  /**
   * Get SLA definition for tenant and tier
   */
  private async getSLADefinition(
    client: PoolClient,
    tenantId: string,
    tier: SLATier
  ): Promise<SLADefinition> {
    const result = await client.query(
      `SELECT * FROM sla_definitions
       WHERE tenant_id = $1 AND tier = $2 AND is_active = true
       ORDER BY effective_from DESC LIMIT 1`,
      [tenantId, tier]
    );

    if (result.rows.length === 0) {
      throw new Error(`No active SLA definition found for tenant ${tenantId} and tier ${tier}`);
    }

    return this.mapRowToSLADefinition(result.rows[0]);
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(client: PoolClient): Promise<string> {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) as count FROM support_tickets
       WHERE ticket_number LIKE $1`,
      [`TKT-${year}-%`]
    );

    const count = parseInt(result.rows[0].count) + 1;
    return `TKT-${year}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Create history entry
   */
  private async createHistoryEntry(
    client: PoolClient,
    ticketId: string,
    userId: string | undefined,
    changeType: string,
    oldValue: string | null,
    newValue: string | null
  ): Promise<void> {
    await client.query(
      `INSERT INTO ticket_history (ticket_id, changed_by, change_type, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [ticketId, userId, changeType, oldValue, newValue]
    );
  }

  /**
   * Initialize background workers
   */
  private initializeWorkers(): void {
    // Ticket processing worker
    new Worker('support-tickets', async (job) => {
      switch (job.name) {
        case 'ticket-created':
          // Send notifications, etc.
          break;
        case 'check-sla':
          const ticket = await this.getTicketById(job.data.ticketId);
          if (ticket) {
            await this.checkSLABreaches(ticket);
          }
          break;
      }
    }, { connection: this.redis });

    // Escalation worker
    new Worker('ticket-escalations', async (job) => {
      // Handle escalations
      this.logger.info({ job: job.name, data: job.data }, 'Processing escalation');
    }, { connection: this.redis });
  }

  /**
   * Map database row to SupportTicket
   */
  private mapRowToTicket(row: any): SupportTicket {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ticketNumber: row.ticket_number,
      customerUserId: row.customer_user_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      organization: row.organization,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      severity: row.severity,
      channel: row.channel,
      assignedTo: row.assigned_to,
      assignedTeam: row.assigned_team,
      slaTier: row.sla_tier,
      responseDueAt: row.response_due_at,
      resolutionDueAt: row.resolution_due_at,
      firstResponseAt: row.first_response_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      tags: row.tags,
      category: row.category,
      subcategory: row.subcategory,
      product: row.product,
      version: row.version,
      satisfactionRating: row.satisfaction_rating,
      satisfactionFeedback: row.satisfaction_feedback,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  /**
   * Map database row to SLADefinition
   */
  private mapRowToSLADefinition(row: any): SLADefinition {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      tier: row.tier,
      sev1ResponseMinutes: row.sev1_response_minutes,
      sev2ResponseMinutes: row.sev2_response_minutes,
      sev3ResponseMinutes: row.sev3_response_minutes,
      sev4ResponseMinutes: row.sev4_response_minutes,
      sev1ResolutionMinutes: row.sev1_resolution_minutes,
      sev2ResolutionMinutes: row.sev2_resolution_minutes,
      sev3ResolutionMinutes: row.sev3_resolution_minutes,
      sev4ResolutionMinutes: row.sev4_resolution_minutes,
      uptimePercentage: parseFloat(row.uptime_percentage),
      supportHours: row.support_hours,
      businessHoursStart: row.business_hours_start,
      businessHoursEnd: row.business_hours_end,
      businessDays: row.business_days,
      creditPercentagePerBreach: row.credit_percentage_per_breach ? parseFloat(row.credit_percentage_per_breach) : undefined,
      maxCreditPercentage: row.max_credit_percentage ? parseFloat(row.max_credit_percentage) : undefined,
      isActive: row.is_active,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      createdAt: row.created_at
    };
  }
}
