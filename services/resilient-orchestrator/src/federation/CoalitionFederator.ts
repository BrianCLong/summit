/**
 * Coalition Federator
 * Manages federated workflow execution across coalition partners
 * Supports task delegation, result aggregation, and trust management
 */

import { EventEmitter } from 'eventemitter3';
import { io as SocketClient, Socket as ClientSocket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';
import type {
  CoalitionPartner,
  FederatedTask,
  Task,
  Workflow,
  CommandReport,
} from '../types.js';
import { logger } from '../utils/logger.js';

interface FederationEvents {
  'partner:connected': (partnerId: string) => void;
  'partner:disconnected': (partnerId: string) => void;
  'partner:trust-updated': (partnerId: string, trustLevel: number) => void;
  'task:delegated': (taskId: string, partnerId: string) => void;
  'task:result-received': (taskId: string, partnerId: string, result: unknown) => void;
  'task:delegation-failed': (taskId: string, partnerId: string, reason: string) => void;
  'workflow:federated': (workflowId: string, partners: string[]) => void;
}

interface PartnerConnection {
  socket: ClientSocket;
  reconnectAttempts: number;
  lastActivity: Date;
}

export class CoalitionFederator extends EventEmitter<FederationEvents> {
  private partners: Map<string, CoalitionPartner> = new Map();
  private connections: Map<string, PartnerConnection> = new Map();
  private federatedTasks: Map<string, FederatedTask> = new Map();
  private taskResults: Map<string, Map<string, unknown>> = new Map();
  private pendingDelegations: Map<string, Task[]> = new Map();

  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 5000;
  private readonly TASK_TIMEOUT_MS = 300000; // 5 minutes
  private readonly TRUST_DECAY_RATE = 0.01;
  private readonly TRUST_BOOST_SUCCESS = 0.05;
  private readonly TRUST_PENALTY_FAILURE = 0.1;

  constructor() {
    super();
    this.startTrustDecay();
  }

  /**
   * Register a coalition partner
   */
  registerPartner(partner: Omit<CoalitionPartner, 'id'>): CoalitionPartner {
    const fullPartner: CoalitionPartner = {
      ...partner,
      id: uuid(),
    };

    this.partners.set(fullPartner.id, fullPartner);
    this.pendingDelegations.set(fullPartner.id, []);

    if (fullPartner.active) {
      this.connectToPartner(fullPartner);
    }

    logger.info('Coalition partner registered', {
      partnerId: fullPartner.id,
      name: fullPartner.name,
    });

    return fullPartner;
  }

  /**
   * Connect to a coalition partner
   */
  async connectToPartner(partner: CoalitionPartner): Promise<boolean> {
    if (partner.endpoints.length === 0) {
      logger.warn('Partner has no endpoints', { partnerId: partner.id });
      return false;
    }

    const endpoint = partner.endpoints.find(e => e.available);
    if (!endpoint) {
      logger.warn('No available endpoints for partner', { partnerId: partner.id });
      return false;
    }

    try {
      const socket = SocketClient(`${endpoint.address}:${endpoint.port}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: this.RECONNECT_DELAY_MS,
      });

      return new Promise((resolve) => {
        socket.on('connect', () => {
          this.connections.set(partner.id, {
            socket,
            reconnectAttempts: 0,
            lastActivity: new Date(),
          });

          this.setupPartnerHandlers(partner.id, socket);
          partner.active = true;

          this.emit('partner:connected', partner.id);
          logger.info('Connected to coalition partner', { partnerId: partner.id });
          resolve(true);
        });

        socket.on('connect_error', (error) => {
          logger.warn('Failed to connect to partner', { partnerId: partner.id, error: error.message });
          resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!socket.connected) {
            socket.disconnect();
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      logger.error('Error connecting to partner', { partnerId: partner.id, error });
      return false;
    }
  }

  private setupPartnerHandlers(partnerId: string, socket: ClientSocket): void {
    socket.on('task:result', (data: { taskId: string; result: unknown }) => {
      this.handleTaskResult(partnerId, data.taskId, data.result);
    });

    socket.on('task:progress', (data: { taskId: string; progress: number }) => {
      this.handleTaskProgress(partnerId, data.taskId, data.progress);
    });

    socket.on('task:failed', (data: { taskId: string; error: string }) => {
      this.handleTaskFailed(partnerId, data.taskId, data.error);
    });

    socket.on('disconnect', () => {
      this.handlePartnerDisconnect(partnerId);
    });

    socket.on('report', (report: CommandReport) => {
      this.handlePartnerReport(partnerId, report);
    });
  }

  /**
   * Delegate a task to a coalition partner
   */
  async delegateTask(
    task: Task,
    partnerId: string,
    delegationPolicy: 'execute' | 'observe' | 'coordinate' = 'execute'
  ): Promise<boolean> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      logger.warn('Partner not found for delegation', { partnerId, taskId: task.id });
      return false;
    }

    // Check trust level
    if (partner.trustLevel < 0.3) {
      logger.warn('Partner trust too low for delegation', {
        partnerId,
        trustLevel: partner.trustLevel,
      });
      return false;
    }

    // Check classification
    if (!this.canShareClassification(partner.classification, 'unclass')) {
      logger.warn('Classification mismatch for delegation', { partnerId });
      return false;
    }

    const connection = this.connections.get(partnerId);
    if (!connection || !connection.socket.connected) {
      // Queue for later
      this.pendingDelegations.get(partnerId)?.push(task);
      this.emit('task:delegation-failed', task.id, partnerId, 'Partner not connected');
      return false;
    }

    const federatedTask: FederatedTask = {
      id: uuid(),
      originPartner: 'self',
      targetPartners: [partnerId],
      task,
      delegationPolicy,
      results: new Map(),
    };

    this.federatedTasks.set(federatedTask.id, federatedTask);
    this.taskResults.set(task.id, new Map());

    // Send task to partner
    connection.socket.emit('task:delegate', {
      federatedTaskId: federatedTask.id,
      task: this.sanitizeTask(task),
      policy: delegationPolicy,
    });

    connection.lastActivity = new Date();
    this.emit('task:delegated', task.id, partnerId);

    logger.info('Task delegated to partner', {
      taskId: task.id,
      partnerId,
      policy: delegationPolicy,
    });

    // Set timeout for task
    setTimeout(() => {
      if (!this.taskResults.get(task.id)?.has(partnerId)) {
        this.handleTaskTimeout(task.id, partnerId);
      }
    }, this.TASK_TIMEOUT_MS);

    return true;
  }

  /**
   * Delegate task to multiple partners (parallel execution)
   */
  async delegateToMultiplePartners(
    task: Task,
    partnerIds: string[],
    quorum: number = 1
  ): Promise<{ delegated: string[]; failed: string[] }> {
    const delegated: string[] = [];
    const failed: string[] = [];

    for (const partnerId of partnerIds) {
      const success = await this.delegateTask(task, partnerId, 'execute');
      if (success) {
        delegated.push(partnerId);
      } else {
        failed.push(partnerId);
      }
    }

    return { delegated, failed };
  }

  /**
   * Federate an entire workflow across partners
   */
  async federateWorkflow(
    workflow: Workflow,
    partnerAssignments: Map<string, string[]> // taskId -> partnerIds
  ): Promise<void> {
    const involvedPartners = new Set<string>();

    for (const [taskId, partnerIds] of partnerAssignments) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (!task) continue;

      for (const partnerId of partnerIds) {
        await this.delegateTask(task, partnerId);
        involvedPartners.add(partnerId);
      }
    }

    if (involvedPartners.size > 0) {
      this.emit('workflow:federated', workflow.id, Array.from(involvedPartners));
    }
  }

  /**
   * Get aggregated results for a federated task
   */
  getAggregatedResults(taskId: string): Map<string, unknown> {
    return this.taskResults.get(taskId) ?? new Map();
  }

  /**
   * Update partner trust level
   */
  updateTrustLevel(partnerId: string, delta: number): void {
    const partner = this.partners.get(partnerId);
    if (!partner) return;

    partner.trustLevel = Math.max(0, Math.min(1, partner.trustLevel + delta));
    this.emit('partner:trust-updated', partnerId, partner.trustLevel);
  }

  /**
   * Get all connected partners
   */
  getConnectedPartners(): CoalitionPartner[] {
    return Array.from(this.partners.values()).filter(p => {
      const conn = this.connections.get(p.id);
      return conn?.socket.connected;
    });
  }

  /**
   * Get partners by capability
   */
  getPartnersByCapability(capability: string): CoalitionPartner[] {
    return Array.from(this.partners.values()).filter(p =>
      p.capabilities.includes(capability) && p.active
    );
  }

  private handleTaskResult(partnerId: string, taskId: string, result: unknown): void {
    this.taskResults.get(taskId)?.set(partnerId, result);

    // Boost trust on success
    this.updateTrustLevel(partnerId, this.TRUST_BOOST_SUCCESS);

    this.emit('task:result-received', taskId, partnerId, result);

    logger.info('Received task result from partner', { taskId, partnerId });
  }

  private handleTaskProgress(partnerId: string, taskId: string, progress: number): void {
    // Update connection activity
    const conn = this.connections.get(partnerId);
    if (conn) {
      conn.lastActivity = new Date();
    }

    logger.debug('Task progress from partner', { taskId, partnerId, progress });
  }

  private handleTaskFailed(partnerId: string, taskId: string, error: string): void {
    // Penalize trust on failure
    this.updateTrustLevel(partnerId, -this.TRUST_PENALTY_FAILURE);

    this.emit('task:delegation-failed', taskId, partnerId, error);

    logger.warn('Task failed at partner', { taskId, partnerId, error });
  }

  private handleTaskTimeout(taskId: string, partnerId: string): void {
    this.updateTrustLevel(partnerId, -this.TRUST_PENALTY_FAILURE / 2);

    this.emit('task:delegation-failed', taskId, partnerId, 'Timeout');

    logger.warn('Task timed out at partner', { taskId, partnerId });
  }

  private handlePartnerDisconnect(partnerId: string): void {
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.active = false;
    }

    this.emit('partner:disconnected', partnerId);

    // Attempt reconnection
    this.scheduleReconnect(partnerId);

    logger.warn('Partner disconnected', { partnerId });
  }

  private handlePartnerReport(partnerId: string, report: CommandReport): void {
    // Process incoming report from partner
    const conn = this.connections.get(partnerId);
    if (conn) {
      conn.lastActivity = new Date();
    }

    logger.info('Received report from partner', {
      partnerId,
      reportType: report.type,
      reportId: report.id,
    });
  }

  private scheduleReconnect(partnerId: string): void {
    const partner = this.partners.get(partnerId);
    if (!partner) return;

    const conn = this.connections.get(partnerId);
    const attempts = conn?.reconnectAttempts ?? 0;

    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnect attempts reached for partner', { partnerId });
      return;
    }

    const delay = this.RECONNECT_DELAY_MS * Math.pow(2, attempts);

    setTimeout(async () => {
      const newConn = this.connections.get(partnerId);
      if (newConn) {
        newConn.reconnectAttempts = attempts + 1;
      }

      await this.connectToPartner(partner);

      // Process pending delegations
      const pending = this.pendingDelegations.get(partnerId) ?? [];
      for (const task of pending) {
        await this.delegateTask(task, partnerId);
      }
      this.pendingDelegations.set(partnerId, []);
    }, delay);
  }

  private sanitizeTask(task: Task): Partial<Task> {
    // Remove sensitive information before delegation
    return {
      id: task.id,
      workflowId: task.workflowId,
      name: task.name,
      type: task.type,
      dependencies: task.dependencies,
      timeout: task.timeout,
      input: task.input,
    };
  }

  private canShareClassification(
    partnerLevel: 'unclass' | 'secret' | 'topsecret',
    dataLevel: 'unclass' | 'secret' | 'topsecret'
  ): boolean {
    const levels = { unclass: 0, secret: 1, topsecret: 2 };
    return levels[partnerLevel] >= levels[dataLevel];
  }

  private startTrustDecay(): void {
    // Gradually decay trust for inactive partners
    setInterval(() => {
      for (const partner of this.partners.values()) {
        const conn = this.connections.get(partner.id);
        if (!conn || !conn.socket.connected) {
          partner.trustLevel = Math.max(0.1, partner.trustLevel - this.TRUST_DECAY_RATE);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Get federation statistics
   */
  getFederationStats(): {
    totalPartners: number;
    connectedPartners: number;
    pendingTasks: number;
    completedTasks: number;
    averageTrust: number;
  } {
    const partners = Array.from(this.partners.values());
    const connected = partners.filter(p => p.active).length;
    const totalTrust = partners.reduce((sum, p) => sum + p.trustLevel, 0);

    let pendingTasks = 0;
    for (const tasks of this.pendingDelegations.values()) {
      pendingTasks += tasks.length;
    }

    return {
      totalPartners: partners.length,
      connectedPartners: connected,
      pendingTasks,
      completedTasks: this.taskResults.size,
      averageTrust: partners.length > 0 ? totalTrust / partners.length : 0,
    };
  }

  dispose(): void {
    for (const conn of this.connections.values()) {
      conn.socket.disconnect();
    }
    this.connections.clear();
    this.removeAllListeners();
  }
}
