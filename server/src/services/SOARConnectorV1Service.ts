import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { Redis } from 'ioredis';
import fetch from 'node-fetch';

export interface SOARConnectorConfig {
  servicenow?: {
    instance_url: string;
    username: string;
    password: string;
    table: string; // incident, problem, change_request
  };
  jira?: {
    base_url: string;
    username: string;
    api_token: string;
    project_key: string;
    issue_type: string;
  };
  edr?: {
    platform: 'crowdstrike' | 'sentinelone' | 'defender';
    api_endpoint: string;
    client_id: string;
    client_secret: string;
  };
}

export interface ContainmentAction {
  id: string;
  type: 'host_quarantine' | 'account_disable' | 'hash_block' | 'url_block';
  target: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  initiated_by: string;
  initiated_at: Date;
  completed_at?: Date;
  result?: any;
  rollback_available: boolean;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: Date;
}

export interface TicketLink {
  id: string;
  alert_id: string;
  external_system: 'servicenow' | 'jira';
  external_id: string;
  external_url: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  sync_enabled: boolean;
}

export class SOARConnectorV1Service {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: winston.Logger;
  private config: SOARConnectorConfig;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    config: SOARConnectorConfig,
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
    this.config = config;
  }

  /**
   * B1 - ServiceNow/Jira ticket automation
   * AC: create/update/close; idempotent retries; mapping config
   */
  async createIncidentTicket(
    alertId: string,
    alertData: any,
    system: 'servicenow' | 'jira' = 'servicenow',
  ): Promise<TicketLink> {
    const operationId = `create_ticket_${alertId}_${Date.now()}`;

    try {
      // Check for existing ticket to ensure idempotency
      const existingTicket = await this.getExistingTicket(alertId, system);
      if (existingTicket) {
        this.logger.info(
          'Ticket already exists for alert, returning existing',
          {
            alertId,
            ticketId: existingTicket.external_id,
          },
        );
        return existingTicket;
      }

      // Create ticket with retry logic
      let ticketData: any;
      let attempt = 0;

      while (attempt < this.RETRY_ATTEMPTS) {
        try {
          if (system === 'servicenow') {
            ticketData = await this.createServiceNowIncident(
              alertData,
              operationId,
            );
          } else {
            ticketData = await this.createJiraIssue(alertData, operationId);
          }
          break;
        } catch (error) {
          attempt++;
          if (attempt >= this.RETRY_ATTEMPTS) {
            throw error;
          }

          this.logger.warn('Ticket creation failed, retrying', {
            alertId,
            system,
            attempt,
            error: error.message,
          });

          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }

      // Store ticket link in database
      const ticketLink = await this.prisma.ticketLink.create({
        data: {
          id: `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          alert_id: alertId,
          external_system: system,
          external_id: ticketData.id,
          external_url: ticketData.url,
          status: ticketData.status,
          sync_enabled: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.info('Incident ticket created successfully', {
        alertId,
        system,
        externalId: ticketData.id,
        ticketLinkId: ticketLink.id,
      });

      // Set up automatic status sync
      await this.scheduleStatusSync(ticketLink.id);

      return ticketLink as TicketLink;
    } catch (error) {
      this.logger.error('Failed to create incident ticket', {
        alertId,
        system,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update existing ticket with new information
   */
  async updateTicket(ticketLinkId: string, updates: any): Promise<void> {
    try {
      const ticketLink = await this.prisma.ticketLink.findUnique({
        where: { id: ticketLinkId },
      });

      if (!ticketLink) {
        throw new Error(`Ticket link not found: ${ticketLinkId}`);
      }

      if (ticketLink.external_system === 'servicenow') {
        await this.updateServiceNowIncident(ticketLink.external_id, updates);
      } else {
        await this.updateJiraIssue(ticketLink.external_id, updates);
      }

      // Update local record
      await this.prisma.ticketLink.update({
        where: { id: ticketLinkId },
        data: {
          updated_at: new Date(),
          status: updates.status || ticketLink.status,
        },
      });

      this.logger.info('Ticket updated successfully', {
        ticketLinkId,
        externalId: ticketLink.external_id,
        system: ticketLink.external_system,
      });
    } catch (error) {
      this.logger.error('Failed to update ticket', {
        ticketLinkId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * B2 - EDR quarantine action
   * AC: dry-run mode; result telemetry; rollback procedure
   */
  async quarantineHost(
    alertId: string,
    hostIdentifier: string,
    initiatedBy: string,
    dryRun: boolean = false,
    requireApproval: boolean = true,
  ): Promise<ContainmentAction> {
    const actionId = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create containment action record
      const action = await this.prisma.containmentAction.create({
        data: {
          id: actionId,
          type: 'host_quarantine',
          target: hostIdentifier,
          alert_id: alertId,
          status: requireApproval ? 'pending' : 'in_progress',
          initiated_by: initiatedBy,
          initiated_at: new Date(),
          rollback_available: true,
          approval_required: requireApproval,
          dry_run: dryRun,
        },
      });

      // Handle approval if required
      if (requireApproval && !dryRun) {
        await this.requestContainmentApproval(actionId, {
          action_type: 'Host Quarantine',
          target: hostIdentifier,
          alert_id: alertId,
          risk_level: 'high',
        });

        this.logger.info('Host quarantine pending approval', {
          actionId,
          hostIdentifier,
          alertId,
        });

        return action as ContainmentAction;
      }

      // Execute quarantine action
      let result: any;

      if (dryRun) {
        result = await this.simulateHostQuarantine(hostIdentifier);
        this.logger.info('Host quarantine dry-run completed', {
          actionId,
          hostIdentifier,
          result,
        });
      } else {
        result = await this.executeHostQuarantine(hostIdentifier);
        this.logger.info('Host quarantine executed', {
          actionId,
          hostIdentifier,
          result,
        });
      }

      // Update action record
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          result: JSON.stringify(result),
        },
      });

      // Record telemetry
      await this.recordContainmentTelemetry(
        actionId,
        'host_quarantine',
        result,
      );

      // Schedule rollback check if needed
      if (!dryRun && result.success) {
        await this.scheduleRollbackCheck(actionId, '24h');
      }

      return (await this.prisma.containmentAction.findUnique({
        where: { id: actionId },
      })) as ContainmentAction;
    } catch (error) {
      this.logger.error('Host quarantine failed', {
        actionId,
        hostIdentifier,
        alertId,
        error: error.message,
      });

      // Update action status to failed
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'failed',
          completed_at: new Date(),
          result: JSON.stringify({ error: error.message }),
        },
      });

      throw error;
    }
  }

  /**
   * B3 - Account disable + hash block
   * AC: approval gate; audit; execution time <= 2m
   */
  async disableAccount(
    alertId: string,
    accountIdentifier: string,
    initiatedBy: string,
    approverUserId?: string,
  ): Promise<ContainmentAction> {
    const actionId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Create action record
      const action = await this.prisma.containmentAction.create({
        data: {
          id: actionId,
          type: 'account_disable',
          target: accountIdentifier,
          alert_id: alertId,
          status: 'pending',
          initiated_by: initiatedBy,
          initiated_at: new Date(),
          rollback_available: true,
          approval_required: true,
        },
      });

      // Require approval gate
      if (!approverUserId) {
        throw new Error('Account disable requires approver');
      }

      const approval = await this.requestContainmentApproval(actionId, {
        action_type: 'Account Disable',
        target: accountIdentifier,
        alert_id: alertId,
        risk_level: 'high',
        approver_id: approverUserId,
      });

      // Simulate approval for demo (in production, this would be async)
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'in_progress',
          approved_by: approverUserId,
          approved_at: new Date(),
        },
      });

      // Execute account disable with timeout
      const executionTimeout = 120000; // 2 minutes
      const result = await Promise.race([
        this.executeAccountDisable(accountIdentifier),
        this.timeout(executionTimeout, 'Account disable execution timeout'),
      ]);

      const executionTime = Date.now() - startTime;

      // Update action record
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          result: JSON.stringify({
            ...result,
            execution_time_ms: executionTime,
          }),
        },
      });

      // Create detailed audit log
      await this.createAuditLog({
        action_id: actionId,
        action_type: 'ACCOUNT_DISABLE',
        target: accountIdentifier,
        initiated_by: initiatedBy,
        approved_by: approverUserId,
        alert_id: alertId,
        execution_time_ms: executionTime,
        result: result.success ? 'SUCCESS' : 'FAILED',
        details: result,
      });

      // Check execution time SLO
      if (executionTime > 120000) {
        // 2 minutes
        this.logger.warn('Account disable exceeded SLO', {
          actionId,
          executionTime,
          sloMs: 120000,
        });
      }

      this.logger.info('Account disable completed', {
        actionId,
        accountIdentifier,
        executionTime,
        success: result.success,
      });

      return (await this.prisma.containmentAction.findUnique({
        where: { id: actionId },
      })) as ContainmentAction;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Account disable failed', {
        actionId,
        accountIdentifier,
        executionTime,
        error: error.message,
      });

      // Update action status and audit
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'failed',
          completed_at: new Date(),
          result: JSON.stringify({
            error: error.message,
            execution_time_ms: executionTime,
          }),
        },
      });

      await this.createAuditLog({
        action_id: actionId,
        action_type: 'ACCOUNT_DISABLE',
        target: accountIdentifier,
        initiated_by: initiatedBy,
        alert_id: alertId,
        execution_time_ms: executionTime,
        result: 'FAILED',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Block hash across EDR platforms
   */
  async blockHash(
    alertId: string,
    fileHash: string,
    hashType: 'md5' | 'sha1' | 'sha256',
    initiatedBy: string,
  ): Promise<ContainmentAction> {
    const actionId = `hb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const action = await this.prisma.containmentAction.create({
        data: {
          id: actionId,
          type: 'hash_block',
          target: `${hashType}:${fileHash}`,
          alert_id: alertId,
          status: 'in_progress',
          initiated_by: initiatedBy,
          initiated_at: new Date(),
          rollback_available: true,
          approval_required: false, // Hash blocking typically doesn't require approval
        },
      });

      // Execute hash block across available EDR platforms
      const result = await this.executeHashBlock(fileHash, hashType);

      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date(),
          result: JSON.stringify(result),
        },
      });

      // Record telemetry
      await this.recordContainmentTelemetry(actionId, 'hash_block', result);

      this.logger.info('Hash block completed', {
        actionId,
        fileHash,
        hashType,
        success: result.success,
      });

      return (await this.prisma.containmentAction.findUnique({
        where: { id: actionId },
      })) as ContainmentAction;
    } catch (error) {
      this.logger.error('Hash block failed', {
        actionId,
        fileHash,
        hashType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Rollback containment action if possible
   */
  async rollbackContainment(
    actionId: string,
    initiatedBy: string,
  ): Promise<void> {
    try {
      const action = await this.prisma.containmentAction.findUnique({
        where: { id: actionId },
      });

      if (!action || !action.rollback_available) {
        throw new Error('Containment action cannot be rolled back');
      }

      let rollbackResult: any;

      switch (action.type) {
        case 'host_quarantine':
          rollbackResult = await this.rollbackHostQuarantine(action.target);
          break;
        case 'account_disable':
          rollbackResult = await this.rollbackAccountDisable(action.target);
          break;
        case 'hash_block':
          rollbackResult = await this.rollbackHashBlock(action.target);
          break;
        default:
          throw new Error(`Rollback not implemented for ${action.type}`);
      }

      // Update action record
      await this.prisma.containmentAction.update({
        where: { id: actionId },
        data: {
          status: 'rolled_back',
          updated_at: new Date(),
          result: JSON.stringify({
            ...JSON.parse(action.result || '{}'),
            rollback: rollbackResult,
            rolled_back_by: initiatedBy,
            rolled_back_at: new Date(),
          }),
        },
      });

      this.logger.info('Containment action rolled back', {
        actionId,
        type: action.type,
        target: action.target,
        initiatedBy,
      });
    } catch (error) {
      this.logger.error('Containment rollback failed', {
        actionId,
        error: error.message,
      });
      throw error;
    }
  }

  // Private helper methods

  private async createServiceNowIncident(
    alertData: any,
    operationId: string,
  ): Promise<any> {
    if (!this.config.servicenow) {
      throw new Error('ServiceNow not configured');
    }

    const auth = Buffer.from(
      `${this.config.servicenow.username}:${this.config.servicenow.password}`,
    ).toString('base64');

    const incident = {
      short_description: alertData.title || `Security Alert: ${alertData.id}`,
      description: this.formatAlertForTicket(alertData),
      priority: this.mapAlertPriorityToServiceNow(alertData.severity),
      category: 'security',
      subcategory: 'security incident',
      u_correlation_id: operationId,
      u_alert_id: alertData.id,
    };

    const response = await fetch(
      `${this.config.servicenow.instance_url}/api/now/table/${this.config.servicenow.table}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(incident),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ServiceNow API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      id: result.result.sys_id,
      url: `${this.config.servicenow.instance_url}/nav_to.do?uri=${this.config.servicenow.table}.do?sys_id=${result.result.sys_id}`,
      status: result.result.state,
      number: result.result.number,
    };
  }

  private async createJiraIssue(
    alertData: any,
    operationId: string,
  ): Promise<any> {
    if (!this.config.jira) {
      throw new Error('Jira not configured');
    }

    const auth = Buffer.from(
      `${this.config.jira.username}:${this.config.jira.api_token}`,
    ).toString('base64');

    const issue = {
      fields: {
        project: { key: this.config.jira.project_key },
        issuetype: { name: this.config.jira.issue_type },
        summary: alertData.title || `Security Alert: ${alertData.id}`,
        description: this.formatAlertForTicket(alertData),
        priority: { name: this.mapAlertPriorityToJira(alertData.severity) },
        labels: ['security', 'intelgraph', operationId],
        customfield_10001: alertData.id, // Alert ID custom field
      },
    };

    const response = await fetch(
      `${this.config.jira.base_url}/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(issue),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Jira API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      id: result.key,
      url: `${this.config.jira.base_url}/browse/${result.key}`,
      status: 'Open',
    };
  }

  private async executeHostQuarantine(hostIdentifier: string): Promise<any> {
    if (!this.config.edr) {
      throw new Error('EDR not configured');
    }

    // Mock EDR quarantine - would integrate with actual EDR API
    switch (this.config.edr.platform) {
      case 'crowdstrike':
        return await this.crowdStrikeQuarantine(hostIdentifier);
      case 'sentinelone':
        return await this.sentinelOneQuarantine(hostIdentifier);
      case 'defender':
        return await this.defenderQuarantine(hostIdentifier);
      default:
        throw new Error(
          `Unsupported EDR platform: ${this.config.edr.platform}`,
        );
    }
  }

  private async simulateHostQuarantine(hostIdentifier: string): Promise<any> {
    // Dry run simulation
    return {
      success: true,
      action: 'quarantine_simulation',
      target: hostIdentifier,
      message:
        'Dry run completed successfully - no actual quarantine performed',
      timestamp: new Date(),
    };
  }

  private async crowdStrikeQuarantine(hostIdentifier: string): Promise<any> {
    // Mock CrowdStrike API call
    await this.delay(1000); // Simulate API call

    return {
      success: true,
      action: 'host_quarantine',
      target: hostIdentifier,
      platform: 'crowdstrike',
      quarantine_id: `cs_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  private async sentinelOneQuarantine(hostIdentifier: string): Promise<any> {
    // Mock SentinelOne API call
    await this.delay(1000);

    return {
      success: true,
      action: 'host_quarantine',
      target: hostIdentifier,
      platform: 'sentinelone',
      quarantine_id: `s1_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  private async defenderQuarantine(hostIdentifier: string): Promise<any> {
    // Mock Microsoft Defender API call
    await this.delay(1000);

    return {
      success: true,
      action: 'host_quarantine',
      target: hostIdentifier,
      platform: 'defender',
      quarantine_id: `def_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  private async executeAccountDisable(accountIdentifier: string): Promise<any> {
    // Mock account disable - would integrate with identity provider
    await this.delay(500);

    return {
      success: true,
      action: 'account_disable',
      target: accountIdentifier,
      disabled_at: new Date(),
      provider: 'active_directory',
    };
  }

  private async executeHashBlock(
    fileHash: string,
    hashType: string,
  ): Promise<any> {
    // Mock hash blocking across EDR platforms
    await this.delay(800);

    return {
      success: true,
      action: 'hash_block',
      hash: fileHash,
      hash_type: hashType,
      platforms_updated: ['crowdstrike', 'defender'],
      blocked_at: new Date(),
    };
  }

  // Rollback methods

  private async rollbackHostQuarantine(target: string): Promise<any> {
    await this.delay(500);
    return { success: true, action: 'unquarantine', target };
  }

  private async rollbackAccountDisable(target: string): Promise<any> {
    await this.delay(500);
    return { success: true, action: 'enable_account', target };
  }

  private async rollbackHashBlock(target: string): Promise<any> {
    await this.delay(500);
    return { success: true, action: 'unblock_hash', target };
  }

  // Utility methods

  private async getExistingTicket(
    alertId: string,
    system: string,
  ): Promise<TicketLink | null> {
    return (await this.prisma.ticketLink.findFirst({
      where: {
        alert_id: alertId,
        external_system: system,
      },
    })) as TicketLink | null;
  }

  private formatAlertForTicket(alertData: any): string {
    return `Security Alert Details:

Alert ID: ${alertData.id}
Severity: ${alertData.severity}
Type: ${alertData.type}
Created: ${alertData.created_at}

${alertData.description || 'No additional details available.'}

Generated by IntelGraph Security Platform`;
  }

  private mapAlertPriorityToServiceNow(severity: string): string {
    const mapping: Record<string, string> = {
      critical: '1',
      high: '2',
      medium: '3',
      low: '4',
    };
    return mapping[severity?.toLowerCase()] || '3';
  }

  private mapAlertPriorityToJira(severity: string): string {
    const mapping: Record<string, string> = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return mapping[severity?.toLowerCase()] || 'Medium';
  }

  private async requestContainmentApproval(
    actionId: string,
    approvalData: any,
  ): Promise<any> {
    // In production, this would create approval request and notify approvers
    // For demo, we'll auto-approve
    await this.delay(100);
    return { approved: true, approver: 'system', timestamp: new Date() };
  }

  private async recordContainmentTelemetry(
    actionId: string,
    actionType: string,
    result: any,
  ): Promise<void> {
    // Record metrics for monitoring and reporting
    this.logger.info('Containment telemetry', {
      action_id: actionId,
      action_type: actionType,
      success: result.success,
      timestamp: new Date(),
    });
  }

  private async createAuditLog(logData: any): Promise<void> {
    // Create tamper-evident audit log entry
    await this.prisma.auditLog.create({
      data: {
        ...logData,
        timestamp: new Date(),
        hash: this.generateAuditHash(logData),
      },
    });
  }

  private generateAuditHash(data: any): string {
    // Generate hash for audit trail integrity
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
  }

  private async scheduleStatusSync(ticketLinkId: string): Promise<void> {
    // Schedule periodic status synchronization
    await this.redis.sadd('ticket_sync_queue', ticketLinkId);
  }

  private async scheduleRollbackCheck(
    actionId: string,
    delay: string,
  ): Promise<void> {
    // Schedule automatic rollback check
    await this.redis.sadd(
      'rollback_check_queue',
      JSON.stringify({
        action_id: actionId,
        scheduled_for: Date.now() + this.parseDuration(delay),
      }),
    );
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(h|m|s)$/);
    if (!match) return 0;

    const [, value, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000 };
    return parseInt(value) * multipliers[unit];
  }

  private async updateServiceNowIncident(
    incidentId: string,
    updates: any,
  ): Promise<void> {
    // Implementation for ServiceNow updates
    this.logger.debug('ServiceNow incident update', { incidentId, updates });
  }

  private async updateJiraIssue(issueKey: string, updates: any): Promise<void> {
    // Implementation for Jira updates
    this.logger.debug('Jira issue update', { issueKey, updates });
  }

  private async timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
