/**
 * Command Reporter
 * Real-time reporting to command and coalition partners
 * Supports priority-based transmission and classification handling
 */

import { EventEmitter } from 'eventemitter3';
import { Server as SocketServer, Socket } from 'socket.io';
import { io as SocketClient, Socket as ClientSocket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';
import type { CommandReport, ReportPayload, Workflow, Task, HealingAction } from '../types.js';
import { SatelliteCommHandler } from '../comms/SatelliteCommHandler.js';
import { logger } from '../utils/logger.js';

interface ReporterEvents {
  'report:sent': (report: CommandReport) => void;
  'report:queued': (report: CommandReport) => void;
  'report:delivered': (reportId: string, destination: string) => void;
  'report:failed': (reportId: string, reason: string) => void;
  'subscriber:connected': (subscriberId: string) => void;
  'subscriber:disconnected': (subscriberId: string) => void;
}

interface Subscriber {
  id: string;
  socket: Socket | ClientSocket;
  classification: 'unclass' | 'secret' | 'topsecret';
  topics: string[];
  connected: boolean;
}

export class CommandReporter extends EventEmitter<ReporterEvents> {
  private server?: SocketServer;
  private satelliteHandler?: SatelliteCommHandler;
  private subscribers: Map<string, Subscriber> = new Map();
  private pendingReports: CommandReport[] = [];
  private sentReports: Map<string, CommandReport> = new Map();
  private coalitionEndpoints: Map<string, string> = new Map();

  private readonly MAX_PENDING_REPORTS = 1000;
  private readonly MAX_SENT_HISTORY = 5000;
  private readonly REPORT_TTL_SECONDS = 3600;

  constructor(options: {
    port?: number;
    satelliteHandler?: SatelliteCommHandler;
  } = {}) {
    super();
    this.satelliteHandler = options.satelliteHandler;

    if (options.port) {
      this.initializeServer(options.port);
    }
  }

  private initializeServer(port: number): void {
    this.server = new SocketServer(port, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling'],
    });

    this.server.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Command reporter server started', { port });
  }

  private handleConnection(socket: Socket): void {
    const subscriberId = uuid();

    socket.on('subscribe', (data: { classification: string; topics: string[] }) => {
      const subscriber: Subscriber = {
        id: subscriberId,
        socket,
        classification: data.classification as 'unclass' | 'secret' | 'topsecret',
        topics: data.topics,
        connected: true,
      };

      this.subscribers.set(subscriberId, subscriber);
      this.emit('subscriber:connected', subscriberId);

      logger.info('Subscriber connected', { subscriberId, topics: data.topics });
    });

    socket.on('disconnect', () => {
      const subscriber = this.subscribers.get(subscriberId);
      if (subscriber) {
        subscriber.connected = false;
        this.emit('subscriber:disconnected', subscriberId);
      }
    });

    socket.on('ack', (reportId: string) => {
      this.emit('report:delivered', reportId, subscriberId);
    });
  }

  /**
   * Register a coalition partner endpoint
   */
  registerCoalitionEndpoint(partnerId: string, endpoint: string): void {
    this.coalitionEndpoints.set(partnerId, endpoint);
    logger.info('Coalition endpoint registered', { partnerId, endpoint });
  }

  /**
   * Send a status report
   */
  async sendStatusReport(
    source: string,
    destination: string[],
    workflow: Workflow,
    additionalMetrics?: Record<string, number>
  ): Promise<CommandReport> {
    const report = this.createReport({
      type: 'status',
      priority: 'routine',
      source,
      destination,
      classification: 'unclass',
      payload: {
        workflowId: workflow.id,
        summary: `Workflow ${workflow.name} status: ${workflow.state}`,
        details: {
          state: workflow.state,
          tasksTotal: workflow.tasks.length,
          tasksCompleted: workflow.tasks.filter(t => t.state === 'completed').length,
          tasksFailed: workflow.tasks.filter(t => t.state === 'failed').length,
          tasksRunning: workflow.tasks.filter(t => t.state === 'running').length,
        },
        metrics: additionalMetrics,
      },
    });

    return this.sendReport(report);
  }

  /**
   * Send an alert report
   */
  async sendAlertReport(
    source: string,
    destination: string[],
    priority: 'flash' | 'immediate' | 'priority',
    summary: string,
    details: Record<string, unknown>,
    classification: 'unclass' | 'secret' | 'topsecret' = 'unclass'
  ): Promise<CommandReport> {
    const report = this.createReport({
      type: 'alert',
      priority,
      source,
      destination,
      classification,
      payload: {
        summary,
        details,
        recommendations: this.generateRecommendations(details),
      },
    });

    return this.sendReport(report);
  }

  /**
   * Send a completion report
   */
  async sendCompletionReport(
    source: string,
    destination: string[],
    workflow: Workflow,
    results: Record<string, unknown>
  ): Promise<CommandReport> {
    const report = this.createReport({
      type: 'completion',
      priority: 'priority',
      source,
      destination,
      classification: 'unclass',
      payload: {
        workflowId: workflow.id,
        summary: `Workflow ${workflow.name} completed successfully`,
        details: {
          duration: this.calculateDuration(workflow),
          tasksExecuted: workflow.tasks.length,
          results,
        },
        metrics: {
          totalTasks: workflow.tasks.length,
          successRate: workflow.tasks.filter(t => t.state === 'completed').length / workflow.tasks.length,
        },
      },
    });

    return this.sendReport(report);
  }

  /**
   * Send a failure report
   */
  async sendFailureReport(
    source: string,
    destination: string[],
    workflow: Workflow,
    task: Task,
    error: string
  ): Promise<CommandReport> {
    const report = this.createReport({
      type: 'failure',
      priority: 'immediate',
      source,
      destination,
      classification: 'unclass',
      payload: {
        workflowId: workflow.id,
        taskId: task.id,
        summary: `Task ${task.name} failed: ${error}`,
        details: {
          workflowState: workflow.state,
          taskState: task.state,
          error: task.error,
          recoverable: task.error?.recoverable ?? false,
        },
        recommendations: [
          'Review task configuration',
          'Check network connectivity',
          'Verify resource availability',
        ],
      },
    });

    return this.sendReport(report);
  }

  /**
   * Send a healing report
   */
  async sendHealingReport(
    source: string,
    destination: string[],
    action: HealingAction
  ): Promise<CommandReport> {
    const report = this.createReport({
      type: 'healing',
      priority: action.success ? 'priority' : 'immediate',
      source,
      destination,
      classification: 'unclass',
      payload: {
        summary: `Healing action ${action.strategy}: ${action.success ? 'succeeded' : 'failed'}`,
        details: {
          strategy: action.strategy,
          targetId: action.targetId,
          targetType: action.targetType,
          reason: action.reason,
          success: action.success,
          ...action.details,
        },
      },
    });

    return this.sendReport(report);
  }

  /**
   * Broadcast report to all applicable subscribers
   */
  async broadcastReport(report: CommandReport): Promise<void> {
    for (const subscriber of this.subscribers.values()) {
      if (!subscriber.connected) continue;

      // Check classification
      if (!this.canReceiveClassification(subscriber.classification, report.classification)) {
        continue;
      }

      // Check topic subscription
      const matchesTopic = subscriber.topics.some(
        topic => topic === '*' || topic === report.type
      );

      if (matchesTopic) {
        subscriber.socket.emit('report', report);
      }
    }
  }

  private createReport(data: Omit<CommandReport, 'id' | 'timestamp'>): CommandReport {
    return {
      ...data,
      id: uuid(),
      timestamp: new Date(),
    };
  }

  private async sendReport(report: CommandReport): Promise<CommandReport> {
    // Broadcast to local subscribers
    await this.broadcastReport(report);

    // Send to coalition partners
    for (const partnerId of report.destination) {
      const endpoint = this.coalitionEndpoints.get(partnerId);
      if (endpoint) {
        await this.sendToCoalition(report, endpoint);
      }
    }

    // Queue for satellite if needed
    if (this.satelliteHandler && !this.hasLocalConnectivity(report.destination)) {
      this.queueForSatellite(report);
    }

    this.sentReports.set(report.id, report);
    this.emit('report:sent', report);

    // Cleanup old reports
    this.cleanupSentReports();

    return report;
  }

  private async sendToCoalition(report: CommandReport, endpoint: string): Promise<void> {
    try {
      const client = SocketClient(endpoint, {
        transports: ['websocket'],
        timeout: 5000,
      });

      await new Promise<void>((resolve, reject) => {
        client.on('connect', () => {
          client.emit('report', report);
          client.disconnect();
          resolve();
        });

        client.on('connect_error', reject);

        setTimeout(() => {
          client.disconnect();
          reject(new Error('Connection timeout'));
        }, 5000);
      });

      this.emit('report:delivered', report.id, endpoint);
    } catch (error) {
      logger.warn('Failed to send report to coalition', { endpoint, reportId: report.id });

      // Queue for later retry
      if (this.pendingReports.length < this.MAX_PENDING_REPORTS) {
        this.pendingReports.push(report);
        this.emit('report:queued', report);
      }
    }
  }

  private queueForSatellite(report: CommandReport): void {
    if (!this.satelliteHandler) return;

    const priority = this.mapPriorityToSatellite(report.priority);
    const payload = Buffer.from(JSON.stringify(report));

    try {
      this.satelliteHandler.queueMessage(
        priority,
        payload,
        report.destination.join(','),
        this.REPORT_TTL_SECONDS
      );
      this.emit('report:queued', report);
    } catch (error) {
      this.emit('report:failed', report.id, 'Satellite queue full');
    }
  }

  private mapPriorityToSatellite(
    priority: CommandReport['priority']
  ): 'flash' | 'immediate' | 'priority' | 'routine' {
    return priority;
  }

  private hasLocalConnectivity(destinations: string[]): boolean {
    for (const dest of destinations) {
      const subscriber = Array.from(this.subscribers.values()).find(
        s => s.id === dest && s.connected
      );
      if (subscriber) return true;

      if (this.coalitionEndpoints.has(dest)) return true;
    }
    return false;
  }

  private canReceiveClassification(
    subscriberLevel: 'unclass' | 'secret' | 'topsecret',
    reportLevel: 'unclass' | 'secret' | 'topsecret'
  ): boolean {
    const levels = { unclass: 0, secret: 1, topsecret: 2 };
    return levels[subscriberLevel] >= levels[reportLevel];
  }

  private generateRecommendations(details: Record<string, unknown>): string[] {
    const recommendations: string[] = [];

    if (details.error) {
      recommendations.push('Review error logs for root cause');
    }
    if (details.networkIssue) {
      recommendations.push('Check network connectivity and routing');
    }
    if (details.resourceExhausted) {
      recommendations.push('Scale resources or reduce workload');
    }

    return recommendations.length > 0
      ? recommendations
      : ['Monitor situation', 'Await further updates'];
  }

  private calculateDuration(workflow: Workflow): number {
    if (!workflow.createdAt) return 0;

    const endTime = workflow.tasks
      .filter(t => t.completedAt)
      .reduce((max, t) => Math.max(max, t.completedAt!.getTime()), 0);

    return endTime > 0 ? endTime - workflow.createdAt.getTime() : 0;
  }

  private cleanupSentReports(): void {
    if (this.sentReports.size > this.MAX_SENT_HISTORY) {
      const sortedIds = Array.from(this.sentReports.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
        .slice(0, this.sentReports.size - this.MAX_SENT_HISTORY)
        .map(([id]) => id);

      for (const id of sortedIds) {
        this.sentReports.delete(id);
      }
    }
  }

  /**
   * Get report statistics
   */
  getReportStats(): {
    sent: number;
    pending: number;
    subscribers: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const report of this.sentReports.values()) {
      byType[report.type] = (byType[report.type] ?? 0) + 1;
      byPriority[report.priority] = (byPriority[report.priority] ?? 0) + 1;
    }

    return {
      sent: this.sentReports.size,
      pending: this.pendingReports.length,
      subscribers: Array.from(this.subscribers.values()).filter(s => s.connected).length,
      byType,
      byPriority,
    };
  }

  dispose(): void {
    this.server?.close();
    this.removeAllListeners();
  }
}
