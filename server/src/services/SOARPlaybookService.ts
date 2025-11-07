import { PrismaClient } from '@prisma/client';
import winston from 'winston';

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  alertId: string;
  executionStatus: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  steps: PlaybookStep[];
  approvals: PlaybookApproval[];
  results: any;
  metadata: Record<string, any>;
}

export interface PlaybookStep {
  id: string;
  name: string;
  type: 'action' | 'approval' | 'condition';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: any;
  output?: any;
  executedAt?: Date;
  error?: string;
}

export interface PlaybookApproval {
  id: string;
  stepId: string;
  approverUserId: string;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  approvedAt?: Date;
}

export class SOARPlaybookService {
  private prisma: PrismaClient;
  private logger: winston.Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Execute phishing containment playbook
   */
  async executePhishingContainment(
    alertId: string,
    evidence: any,
  ): Promise<PlaybookExecution> {
    const playbook = await this.createPlaybookExecution(
      'phishing-containment-v1.1',
      alertId,
      {
        emailMessageId: evidence.messageId,
        senderEmail: evidence.senderEmail,
        recipientEmails: evidence.recipientEmails,
        subject: evidence.subject,
        attachmentHashes: evidence.attachmentHashes || [],
      },
    );

    try {
      // Step 1: Auto-quarantine the message
      await this.executeStep(playbook.id, 'quarantine-message', async () => {
        return await this.quarantineEmail({
          messageId: evidence.messageId,
          reason: 'Automated phishing detection',
        });
      });

      // Step 2: Block sender at email gateway
      await this.executeStep(playbook.id, 'block-sender', async () => {
        return await this.blockEmailSender({
          senderEmail: evidence.senderEmail,
          reason: 'Phishing campaign detected',
        });
      });

      // Step 3: Check for additional messages from sender
      await this.executeStep(
        playbook.id,
        'search-similar-messages',
        async () => {
          return await this.searchSimilarMessages({
            senderEmail: evidence.senderEmail,
            timeWindow: '24h',
          });
        },
      );

      // Step 4: Create incident ticket with linkback
      await this.executeStep(
        playbook.id,
        'create-incident-ticket',
        async () => {
          return await this.createIncidentTicket({
            title: `Phishing Campaign - ${evidence.senderEmail}`,
            priority: 'high',
            alertId,
            description: `Automated containment executed for phishing email from ${evidence.senderEmail}`,
          });
        },
      );

      // Step 5: Generate containment report
      await this.executeStep(playbook.id, 'generate-report', async () => {
        return await this.generateContainmentReport(playbook.id);
      });

      await this.completePlaybookExecution(playbook.id, 'completed');
      return playbook;
    } catch (error) {
      this.logger.error('Phishing containment playbook failed', {
        error,
        alertId,
      });
      await this.completePlaybookExecution(playbook.id, 'failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute forced MFA reset playbook
   */
  async executeForcedMFAReset(
    alertId: string,
    evidence: any,
    approverUserId: string,
  ): Promise<PlaybookExecution> {
    const playbook = await this.createPlaybookExecution(
      'forced-mfa-reset-v1.1',
      alertId,
      {
        userId: evidence.userId,
        userEmail: evidence.userEmail,
        reason: evidence.reason || 'Security incident detected',
        approverUserId,
      },
    );

    try {
      // Step 1: Require approval gate
      const approvalResult = await this.requireApproval(
        playbook.id,
        'mfa-reset-approval',
        approverUserId,
        {
          action: 'Force MFA Reset',
          target: evidence.userEmail,
          reason: evidence.reason,
          riskLevel: 'high',
        },
      );

      if (approvalResult.status !== 'approved') {
        await this.completePlaybookExecution(playbook.id, 'cancelled', {
          reason: 'Approval denied',
          denialReason: approvalResult.reason,
        });
        return playbook;
      }

      // Step 2: Reset MFA for user
      await this.executeStep(playbook.id, 'reset-mfa', async () => {
        return await this.resetUserMFA({
          userId: evidence.userId,
          reason: `Security incident - approved by ${approverUserId}`,
        });
      });

      // Step 3: Send notification to user
      await this.executeStep(playbook.id, 'notify-user', async () => {
        return await this.sendUserNotification({
          userEmail: evidence.userEmail,
          template: 'mfa-reset-security',
          variables: {
            reason: evidence.reason,
            resetTime: new Date().toISOString(),
          },
        });
      });

      // Step 4: Create audit log entry
      await this.executeStep(playbook.id, 'audit-log', async () => {
        return await this.createAuditLog({
          action: 'MFA_RESET_FORCED',
          userId: evidence.userId,
          performedBy: 'SOAR_AUTOMATION',
          approvedBy: approverUserId,
          reason: evidence.reason,
          alertId,
        });
      });

      await this.completePlaybookExecution(playbook.id, 'completed');
      return playbook;
    } catch (error) {
      this.logger.error('Forced MFA reset playbook failed', { error, alertId });
      await this.completePlaybookExecution(playbook.id, 'failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute URL block at proxy playbook
   */
  async executeURLBlock(
    alertId: string,
    evidence: any,
  ): Promise<PlaybookExecution> {
    const playbook = await this.createPlaybookExecution(
      'url-block-proxy-v1.1',
      alertId,
      {
        urls: evidence.urls,
        category: evidence.category || 'malicious',
        reason: evidence.reason || 'Threat detected',
      },
    );

    try {
      // Step 1: Add URLs to proxy blocklist
      await this.executeStep(playbook.id, 'add-to-blocklist', async () => {
        return await this.addToProxyBlocklist({
          urls: evidence.urls,
          category: evidence.category,
          reason: evidence.reason,
          ttl: 86400, // 24 hours
        });
      });

      // Step 2: Check current active connections
      await this.executeStep(
        playbook.id,
        'check-active-connections',
        async () => {
          return await this.checkActiveConnections({
            urls: evidence.urls,
          });
        },
      );

      // Step 3: Terminate active connections if found
      await this.executeStep(playbook.id, 'terminate-connections', async () => {
        const activeConnections = await this.checkActiveConnections({
          urls: evidence.urls,
        });

        if (activeConnections.length > 0) {
          return await this.terminateConnections({
            connections: activeConnections,
            reason: 'Malicious URL blocked',
          });
        }

        return { terminated: 0, message: 'No active connections found' };
      });

      // Step 4: Generate telemetry and monitoring
      await this.executeStep(playbook.id, 'setup-monitoring', async () => {
        return await this.setupURLMonitoring({
          urls: evidence.urls,
          alertOnAttempts: true,
          duration: '24h',
        });
      });

      // Step 5: Schedule automatic rollback if needed
      if (evidence.autoRollback) {
        await this.executeStep(playbook.id, 'schedule-rollback', async () => {
          return await this.scheduleRollback({
            urls: evidence.urls,
            rollbackAfter: evidence.autoRollbackHours || 24,
            reason: 'Automatic rollback scheduled',
          });
        });
      }

      await this.completePlaybookExecution(playbook.id, 'completed');
      return playbook;
    } catch (error) {
      this.logger.error('URL block playbook failed', { error, alertId });
      await this.completePlaybookExecution(playbook.id, 'failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get playbook execution status
   */
  async getPlaybookExecution(
    executionId: string,
  ): Promise<PlaybookExecution | null> {
    try {
      const execution = await this.prisma.playbookExecution.findUnique({
        where: { id: executionId },
        include: {
          steps: true,
          approvals: true,
        },
      });

      return execution as PlaybookExecution | null;
    } catch (error) {
      this.logger.error('Failed to get playbook execution', {
        error,
        executionId,
      });
      return null;
    }
  }

  /**
   * List playbook executions for an alert
   */
  async getPlaybookExecutionsForAlert(
    alertId: string,
  ): Promise<PlaybookExecution[]> {
    try {
      const executions = await this.prisma.playbookExecution.findMany({
        where: { alertId },
        include: {
          steps: true,
          approvals: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      return executions as PlaybookExecution[];
    } catch (error) {
      this.logger.error('Failed to get playbook executions for alert', {
        error,
        alertId,
      });
      return [];
    }
  }

  // Private helper methods

  private async createPlaybookExecution(
    playbookId: string,
    alertId: string,
    metadata: any,
  ): Promise<PlaybookExecution> {
    const execution = await this.prisma.playbookExecution.create({
      data: {
        playbookId,
        alertId,
        executionStatus: 'running',
        startedAt: new Date(),
        steps: [],
        approvals: [],
        results: {},
        metadata,
      },
    });

    this.logger.info('Playbook execution started', {
      executionId: execution.id,
      playbookId,
      alertId,
    });

    return execution as PlaybookExecution;
  }

  private async executeStep(
    executionId: string,
    stepName: string,
    action: () => Promise<any>,
  ): Promise<any> {
    const step = await this.prisma.playbookStep.create({
      data: {
        executionId,
        name: stepName,
        type: 'action',
        status: 'running',
        input: {},
      },
    });

    try {
      const result = await action();

      await this.prisma.playbookStep.update({
        where: { id: step.id },
        data: {
          status: 'completed',
          output: result,
          executedAt: new Date(),
        },
      });

      this.logger.info('Playbook step completed', {
        executionId,
        stepName,
        stepId: step.id,
      });

      return result;
    } catch (error) {
      await this.prisma.playbookStep.update({
        where: { id: step.id },
        data: {
          status: 'failed',
          error: error.message,
          executedAt: new Date(),
        },
      });

      this.logger.error('Playbook step failed', {
        executionId,
        stepName,
        stepId: step.id,
        error: error.message,
      });

      throw error;
    }
  }

  private async requireApproval(
    executionId: string,
    stepName: string,
    approverUserId: string,
    approvalData: any,
  ): Promise<PlaybookApproval> {
    const step = await this.prisma.playbookStep.create({
      data: {
        executionId,
        name: stepName,
        type: 'approval',
        status: 'pending',
        input: approvalData,
      },
    });

    const approval = await this.prisma.playbookApproval.create({
      data: {
        stepId: step.id,
        approverUserId,
        status: 'pending',
      },
    });

    // In a real implementation, you would send a notification to the approver
    // and wait for their response. For now, we'll simulate auto-approval for demo

    // Simulate approval process (in reality this would be async)
    const approvalResult = await this.simulateApproval(
      approval.id,
      approverUserId,
    );

    return approvalResult as PlaybookApproval;
  }

  private async simulateApproval(
    approvalId: string,
    approverUserId: string,
  ): Promise<any> {
    // This is a simulation - in reality, approval would be handled by UI/API
    const approved = await this.prisma.playbookApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        reason: 'Automatic approval for demo',
        approvedAt: new Date(),
      },
    });

    return approved;
  }

  private async completePlaybookExecution(
    executionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    results?: any,
  ): Promise<void> {
    await this.prisma.playbookExecution.update({
      where: { id: executionId },
      data: {
        executionStatus: status,
        completedAt: new Date(),
        results: results || {},
      },
    });

    this.logger.info('Playbook execution completed', {
      executionId,
      status,
    });
  }

  // Mock implementation of external integrations
  private async quarantineEmail(params: any): Promise<any> {
    // Mock implementation - would integrate with email security system
    return {
      messageId: params.messageId,
      quarantined: true,
      timestamp: new Date(),
    };
  }

  private async blockEmailSender(params: any): Promise<any> {
    // Mock implementation - would integrate with email gateway
    return {
      senderEmail: params.senderEmail,
      blocked: true,
      timestamp: new Date(),
    };
  }

  private async searchSimilarMessages(params: any): Promise<any> {
    // Mock implementation - would search email logs
    return { similarMessages: [], searchQuery: params };
  }

  private async createIncidentTicket(params: any): Promise<any> {
    // Mock implementation - would integrate with ITSM system
    return {
      ticketId: 'INC-' + Date.now(),
      title: params.title,
      created: true,
    };
  }

  private async generateContainmentReport(executionId: string): Promise<any> {
    // Mock implementation - would generate detailed report
    return { reportId: 'RPT-' + Date.now(), executionId, generated: true };
  }

  private async resetUserMFA(params: any): Promise<any> {
    // Mock implementation - would integrate with identity provider
    return { userId: params.userId, mfaReset: true, timestamp: new Date() };
  }

  private async sendUserNotification(params: any): Promise<any> {
    // Mock implementation - would send email notification
    return {
      userEmail: params.userEmail,
      notificationSent: true,
      timestamp: new Date(),
    };
  }

  private async createAuditLog(params: any): Promise<any> {
    // Mock implementation - would create audit log entry
    return {
      auditId: 'AUD-' + Date.now(),
      action: params.action,
      timestamp: new Date(),
    };
  }

  private async addToProxyBlocklist(params: any): Promise<any> {
    // Mock implementation - would integrate with proxy/firewall
    return { urls: params.urls, blocked: true, timestamp: new Date() };
  }

  private async checkActiveConnections(params: any): Promise<any[]> {
    // Mock implementation - would check network monitoring
    return []; // No active connections for demo
  }

  private async terminateConnections(params: any): Promise<any> {
    // Mock implementation - would terminate network connections
    return { terminated: params.connections.length, timestamp: new Date() };
  }

  private async setupURLMonitoring(params: any): Promise<any> {
    // Mock implementation - would setup monitoring alerts
    return {
      urls: params.urls,
      monitoringEnabled: true,
      timestamp: new Date(),
    };
  }

  private async scheduleRollback(params: any): Promise<any> {
    // Mock implementation - would schedule automated rollback
    return {
      urls: params.urls,
      rollbackScheduled: true,
      rollbackAt: new Date(Date.now() + params.rollbackAfter * 60 * 60 * 1000),
    };
  }
}
