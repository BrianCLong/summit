/**
 * Data Quality Stewardship and Workflow Automation
 * Manages issue tracking, approval workflows, and task automation
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import {
  ValidationResult,
  DataAnomaly,
  QualityScore,
} from '../types.js';

export interface StewardshipTask {
  id: string;
  type: 'data-issue' | 'approval' | 'certification' | 'review' | 'remediation';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'pending-approval' | 'resolved' | 'closed';
  assignee?: string;
  assigneeGroup?: string;
  datasetId: string;
  relatedEntities: RelatedEntity[];
  dueDate?: Date;
  slaDeadline?: Date;
  escalationLevel: number;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  auditTrail: AuditEntry[];
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface RelatedEntity {
  type: 'validation-result' | 'anomaly' | 'quality-score' | 'remediation-plan';
  id: string;
  name: string;
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  previousValue?: any;
  newValue?: any;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggerType: 'manual' | 'automatic' | 'scheduled';
  triggerConditions?: TriggerCondition[];
  steps: WorkflowStep[];
  escalationRules: EscalationRule[];
  notifications: NotificationRule[];
  slaConfig?: SLAConfig;
  enabled: boolean;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'greater-than' | 'less-than' | 'contains';
  value: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'approval' | 'notification' | 'automation' | 'conditional';
  config: Record<string, any>;
  assignTo?: string;
  nextSteps: string[];
  onSuccess?: string;
  onFailure?: string;
}

export interface EscalationRule {
  triggerAfter: number; // hours
  escalateTo: string;
  notifyChannels: string[];
}

export interface NotificationRule {
  event: 'created' | 'assigned' | 'updated' | 'escalated' | 'resolved';
  recipients: string[];
  channels: ('email' | 'slack' | 'teams' | 'webhook')[];
  template: string;
}

export interface SLAConfig {
  responseTime: number; // hours
  resolutionTime: number; // hours
  escalationThresholds: number[]; // percentage of time elapsed
}

export interface StewardshipMetrics {
  totalTasks: number;
  openTasks: number;
  resolvedTasks: number;
  averageResolutionTime: number;
  slaComplianceRate: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByAssignee: Record<string, number>;
  overdueTasks: number;
}

export class DataSteward extends EventEmitter {
  private tasks: Map<string, StewardshipTask> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor(private pool: Pool) {
    super();
    this.initializeDefaultWorkflows();
  }

  /**
   * Create a stewardship task from validation failure
   */
  async createTaskFromValidation(
    validationResult: ValidationResult,
    datasetId: string,
    createdBy: string
  ): Promise<StewardshipTask> {
    const task: StewardshipTask = {
      id: this.generateId(),
      type: 'data-issue',
      title: `Data Quality Issue: ${validationResult.ruleName}`,
      description: validationResult.message,
      priority: this.mapSeverityToPriority(validationResult.severity),
      status: 'open',
      datasetId,
      relatedEntities: [{
        type: 'validation-result',
        id: validationResult.ruleId,
        name: validationResult.ruleName,
      }],
      escalationLevel: 0,
      comments: [],
      attachments: [],
      auditTrail: [{
        timestamp: new Date(),
        action: 'created',
        actor: 'system',
      }],
      metadata: {
        affectedRows: validationResult.affectedRows,
        affectedColumns: validationResult.affectedColumns,
        violations: validationResult.violations.slice(0, 10),
      },
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveTask(task);
    this.emit('task:created', task);
    await this.triggerWorkflow('data-issue', task);

    return task;
  }

  /**
   * Create a stewardship task from anomaly detection
   */
  async createTaskFromAnomaly(
    anomaly: DataAnomaly,
    createdBy: string
  ): Promise<StewardshipTask> {
    const task: StewardshipTask = {
      id: this.generateId(),
      type: 'data-issue',
      title: `Anomaly Detected: ${anomaly.type}`,
      description: anomaly.description,
      priority: this.mapSeverityToPriority(anomaly.severity),
      status: 'open',
      datasetId: anomaly.datasetId,
      relatedEntities: [{
        type: 'anomaly',
        id: anomaly.id,
        name: anomaly.type,
      }],
      escalationLevel: 0,
      comments: [],
      attachments: [],
      auditTrail: [{
        timestamp: new Date(),
        action: 'created',
        actor: 'system',
      }],
      metadata: {
        anomalyType: anomaly.type,
        confidence: anomaly.confidence,
        suggestedAction: anomaly.suggestedAction,
        affectedData: anomaly.affectedData,
      },
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveTask(task);
    this.emit('task:created', task);
    await this.triggerWorkflow('anomaly-detected', task);

    return task;
  }

  /**
   * Create certification request
   */
  async createCertificationRequest(
    datasetId: string,
    requestedBy: string,
    qualityScore: QualityScore
  ): Promise<StewardshipTask> {
    const task: StewardshipTask = {
      id: this.generateId(),
      type: 'certification',
      title: `Data Certification Request: ${datasetId}`,
      description: `Request to certify dataset ${datasetId} with quality score ${qualityScore.overallScore.toFixed(2)}%`,
      priority: 'medium',
      status: 'pending-approval',
      datasetId,
      relatedEntities: [{
        type: 'quality-score',
        id: `score_${datasetId}`,
        name: `Quality Score: ${qualityScore.overallScore.toFixed(2)}%`,
      }],
      escalationLevel: 0,
      comments: [],
      attachments: [],
      auditTrail: [{
        timestamp: new Date(),
        action: 'created',
        actor: requestedBy,
      }],
      metadata: {
        qualityScore: qualityScore.overallScore,
        dimensions: qualityScore.dimensions,
        recommendations: qualityScore.recommendations,
      },
      createdBy: requestedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveTask(task);
    this.emit('task:created', task);
    await this.triggerWorkflow('certification-request', task);

    return task;
  }

  /**
   * Assign task to user or group
   */
  async assignTask(taskId: string, assignee: string, assignedBy: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.assignee = assignee;
    task.status = 'in-progress';
    task.updatedAt = new Date();
    task.auditTrail.push({
      timestamp: new Date(),
      action: 'assigned',
      actor: assignedBy,
      previousValue: task.assignee,
      newValue: assignee,
    });

    await this.saveTask(task);
    this.emit('task:assigned', task);
  }

  /**
   * Add comment to task
   */
  async addComment(
    taskId: string,
    author: string,
    content: string,
    isInternal = false
  ): Promise<TaskComment> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const comment: TaskComment = {
      id: this.generateId(),
      author,
      content,
      createdAt: new Date(),
      isInternal,
    };

    task.comments.push(comment);
    task.updatedAt = new Date();
    task.auditTrail.push({
      timestamp: new Date(),
      action: 'comment-added',
      actor: author,
    });

    await this.saveTask(task);
    this.emit('task:commented', { task, comment });

    return comment;
  }

  /**
   * Resolve task
   */
  async resolveTask(taskId: string, resolvedBy: string, resolution: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'resolved';
    task.resolvedAt = new Date();
    task.resolvedBy = resolvedBy;
    task.updatedAt = new Date();
    task.auditTrail.push({
      timestamp: new Date(),
      action: 'resolved',
      actor: resolvedBy,
      newValue: resolution,
    });

    await this.saveTask(task);
    this.emit('task:resolved', task);
  }

  /**
   * Escalate task
   */
  async escalateTask(taskId: string, escalatedBy: string, reason: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.escalationLevel++;
    task.priority = this.increasePriority(task.priority);
    task.updatedAt = new Date();
    task.auditTrail.push({
      timestamp: new Date(),
      action: 'escalated',
      actor: escalatedBy,
      newValue: { level: task.escalationLevel, reason },
    });

    await this.saveTask(task);
    this.emit('task:escalated', task);
  }

  /**
   * Get stewardship metrics
   */
  async getMetrics(): Promise<StewardshipMetrics> {
    const allTasks = Array.from(this.tasks.values());
    const now = new Date();

    const resolvedTasks = allTasks.filter(t => t.status === 'resolved');
    const openTasks = allTasks.filter(t => t.status !== 'resolved' && t.status !== 'closed');

    const resolutionTimes = resolvedTasks
      .filter(t => t.resolvedAt && t.createdAt)
      .map(t => t.resolvedAt!.getTime() - t.createdAt.getTime());

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / (1000 * 60 * 60)
      : 0;

    const overdueTasks = openTasks.filter(t =>
      t.slaDeadline && new Date(t.slaDeadline) < now
    ).length;

    const slaCompliant = resolvedTasks.filter(t =>
      t.slaDeadline && t.resolvedAt && new Date(t.resolvedAt) <= new Date(t.slaDeadline)
    ).length;

    return {
      totalTasks: allTasks.length,
      openTasks: openTasks.length,
      resolvedTasks: resolvedTasks.length,
      averageResolutionTime: avgResolutionTime,
      slaComplianceRate: resolvedTasks.length > 0 ? (slaCompliant / resolvedTasks.length) * 100 : 100,
      tasksByPriority: this.groupBy(allTasks, 'priority'),
      tasksByStatus: this.groupBy(allTasks, 'status'),
      tasksByAssignee: this.groupBy(allTasks.filter(t => t.assignee), 'assignee'),
      overdueTasks,
    };
  }

  /**
   * Register workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  private async triggerWorkflow(triggerType: string, task: StewardshipTask): Promise<void> {
    for (const [_, workflow] of this.workflows) {
      if (workflow.enabled && workflow.triggerType === 'automatic') {
        const shouldTrigger = workflow.triggerConditions?.every(condition =>
          this.evaluateCondition(condition, task)
        ) ?? true;

        if (shouldTrigger) {
          await this.executeWorkflow(workflow, task);
        }
      }
    }
  }

  private async executeWorkflow(workflow: WorkflowDefinition, task: StewardshipTask): Promise<void> {
    for (const step of workflow.steps) {
      switch (step.type) {
        case 'task':
          // Task creation/update logic
          break;
        case 'notification':
          this.emit('notification:send', {
            task,
            step,
            workflow,
          });
          break;
        case 'automation':
          this.emit('automation:trigger', {
            task,
            step,
            workflow,
          });
          break;
      }
    }
  }

  private evaluateCondition(condition: TriggerCondition, task: StewardshipTask): boolean {
    const value = (task as any)[condition.field] ?? task.metadata[condition.field];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater-than':
        return value > condition.value;
      case 'less-than':
        return value < condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      default:
        return false;
    }
  }

  private initializeDefaultWorkflows(): void {
    // Auto-assign critical issues
    this.registerWorkflow({
      id: 'auto-assign-critical',
      name: 'Auto-assign Critical Issues',
      description: 'Automatically assign critical data quality issues',
      triggerType: 'automatic',
      triggerConditions: [
        { field: 'priority', operator: 'equals', value: 'critical' },
      ],
      steps: [
        {
          id: 'notify',
          name: 'Notify Data Stewards',
          type: 'notification',
          config: { template: 'critical-issue' },
          nextSteps: [],
        },
      ],
      escalationRules: [
        {
          triggerAfter: 4,
          escalateTo: 'data-governance-team',
          notifyChannels: ['email', 'slack'],
        },
      ],
      notifications: [
        {
          event: 'created',
          recipients: ['data-stewards'],
          channels: ['email', 'slack'],
          template: 'new-critical-issue',
        },
      ],
      slaConfig: {
        responseTime: 1,
        resolutionTime: 24,
        escalationThresholds: [50, 75, 90],
      },
      enabled: true,
    });
  }

  private async saveTask(task: StewardshipTask): Promise<void> {
    this.tasks.set(task.id, task);
    // Database persistence would go here
  }

  private mapSeverityToPriority(severity: string): StewardshipTask['priority'] {
    const mapping: Record<string, StewardshipTask['priority']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return mapping[severity] || 'medium';
  }

  private increasePriority(priority: StewardshipTask['priority']): StewardshipTask['priority'] {
    const levels: StewardshipTask['priority'][] = ['low', 'medium', 'high', 'critical'];
    const index = levels.indexOf(priority);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
