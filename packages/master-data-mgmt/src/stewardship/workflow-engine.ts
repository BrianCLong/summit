/**
 * Workflow Engine
 * Manages data stewardship workflows including task creation, assignment,
 * escalation, and SLA management for master data governance.
 */

import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import type {
  StewardshipTask,
  StewardshipTaskType,
  TaskPriority,
  TaskStatus,
  TaskData,
  TaskComment,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowCondition,
  AssignmentRule,
  EscalationRule,
  SLAConfig,
  MDMDomain,
} from '../types.js';

const tracer = trace.getTracer('master-data-mgmt');

/**
 * Configuration for workflow engine
 */
export interface WorkflowEngineConfig {
  enableNotifications?: boolean;
  notificationChannels?: ('email' | 'slack' | 'sms')[];
  enableSLA?: boolean;
  autoAssignment?: boolean;
  maxTasksPerUser?: number;
}

/**
 * Task assignment context
 */
export interface AssignmentContext {
  taskType: StewardshipTaskType;
  priority: TaskPriority;
  domain: MDMDomain;
  taskData: TaskData;
  availableUsers: string[];
  userWorkload: Map<string, number>;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  taskId: string;
  currentStep?: WorkflowStep;
  completedSteps: string[];
  errors: string[];
  warnings: string[];
}

/**
 * SLA violation info
 */
export interface SLAViolation {
  taskId: string;
  violationType: 'response_time' | 'resolution_time';
  expectedTime: number;
  actualTime: number;
  severity: 'warning' | 'critical';
}

/**
 * Workflow Engine
 * Manages data stewardship workflows and tasks
 */
export class WorkflowEngine {
  private config: Required<WorkflowEngineConfig>;
  private workflows: Map<string, WorkflowDefinition>;
  private tasks: Map<string, StewardshipTask>;
  private taskTimers: Map<string, NodeJS.Timeout>;

  constructor(config: WorkflowEngineConfig = {}) {
    this.config = {
      enableNotifications: config.enableNotifications ?? true,
      notificationChannels: config.notificationChannels ?? ['email'],
      enableSLA: config.enableSLA ?? true,
      autoAssignment: config.autoAssignment ?? true,
      maxTasksPerUser: config.maxTasksPerUser ?? 20,
    };

    this.workflows = new Map();
    this.tasks = new Map();
    this.taskTimers = new Map();
  }

  /**
   * Register a workflow definition
   */
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    return tracer.startActiveSpan(
      'WorkflowEngine.registerWorkflow',
      async (span) => {
        try {
          span.setAttribute('workflow.id', workflow.workflowId);
          span.setAttribute('workflow.name', workflow.name);

          // Validate workflow
          this.validateWorkflow(workflow);

          // Register workflow
          this.workflows.set(workflow.workflowId, workflow);
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Create a new stewardship task
   */
  async createTask(
    taskType: StewardshipTaskType,
    domain: MDMDomain,
    title: string,
    description: string,
    data: TaskData,
    priority: TaskPriority = 'medium',
    createdBy: string,
    dueDate?: Date
  ): Promise<StewardshipTask> {
    return tracer.startActiveSpan('WorkflowEngine.createTask', async (span) => {
      try {
        span.setAttribute('task.type', taskType);
        span.setAttribute('task.priority', priority);
        span.setAttribute('domain', domain);

        const task: StewardshipTask = {
          taskId: uuidv4(),
          taskType,
          domain,
          priority,
          status: 'pending',
          title,
          description,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate,
          data,
          comments: [],
          metadata: {},
        };

        // Find applicable workflow
        const workflow = this.findWorkflow(taskType, domain);

        // Auto-assign if enabled
        if (this.config.autoAssignment && workflow?.autoAssign) {
          const assignedUser = await this.autoAssignTask(
            task,
            workflow.assignmentRules
          );
          if (assignedUser) {
            task.assignedTo = assignedUser;
            task.assignedAt = new Date();
            task.status = 'assigned';
          }
        }

        // Set SLA deadline if applicable
        if (this.config.enableSLA && workflow?.sla) {
          task.dueDate = this.calculateSLADeadline(
            task.createdAt,
            workflow.sla.resolutionTime,
            workflow.sla
          );
        }

        // Store task
        this.tasks.set(task.taskId, task);

        // Setup escalation if applicable
        if (workflow?.escalationRules) {
          this.setupEscalation(task, workflow.escalationRules);
        }

        span.setAttribute('task.id', task.taskId);
        span.setAttribute('assigned.to', task.assignedTo || 'unassigned');

        return task;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    userId: string,
    comment?: string
  ): Promise<StewardshipTask> {
    return tracer.startActiveSpan(
      'WorkflowEngine.updateTaskStatus',
      async (span) => {
        try {
          span.setAttribute('task.id', taskId);
          span.setAttribute('new.status', newStatus);

          const task = this.tasks.get(taskId);
          if (!task) {
            throw new Error(`Task ${taskId} not found`);
          }

          const oldStatus = task.status;
          task.status = newStatus;
          task.updatedAt = new Date();

          // Handle status transitions
          if (newStatus === 'completed') {
            task.completedAt = new Date();
            task.completedBy = userId;
            this.cancelTaskTimer(taskId);
          }

          if (newStatus === 'assigned' && !task.assignedTo) {
            task.assignedTo = userId;
            task.assignedAt = new Date();
          }

          // Add comment if provided
          if (comment) {
            await this.addTaskComment(taskId, userId, comment);
          }

          // Send notifications
          if (this.config.enableNotifications) {
            await this.sendNotification(task, `Status changed from ${oldStatus} to ${newStatus}`);
          }

          span.setAttribute('status.changed', `${oldStatus} -> ${newStatus}`);

          return task;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Assign task to user
   */
  async assignTask(
    taskId: string,
    userId: string,
    assignedBy: string
  ): Promise<StewardshipTask> {
    return tracer.startActiveSpan('WorkflowEngine.assignTask', async (span) => {
      try {
        span.setAttribute('task.id', taskId);
        span.setAttribute('assigned.to', userId);

        const task = this.tasks.get(taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        task.assignedTo = userId;
        task.assignedAt = new Date();
        task.status = 'assigned';
        task.updatedAt = new Date();

        // Add assignment comment
        await this.addTaskComment(
          taskId,
          assignedBy,
          `Task assigned to ${userId}`
        );

        // Send notification
        if (this.config.enableNotifications) {
          await this.sendNotification(task, `Task assigned to ${userId}`);
        }

        return task;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Add comment to task
   */
  async addTaskComment(
    taskId: string,
    userId: string,
    comment: string,
    userName?: string
  ): Promise<TaskComment> {
    return tracer.startActiveSpan(
      'WorkflowEngine.addTaskComment',
      async (span) => {
        try {
          span.setAttribute('task.id', taskId);

          const task = this.tasks.get(taskId);
          if (!task) {
            throw new Error(`Task ${taskId} not found`);
          }

          const taskComment: TaskComment = {
            commentId: uuidv4(),
            userId,
            userName: userName || userId,
            comment,
            createdAt: new Date(),
          };

          task.comments.push(taskComment);
          task.updatedAt = new Date();

          return taskComment;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Get tasks by criteria
   */
  async getTasks(criteria: {
    status?: TaskStatus;
    assignedTo?: string;
    domain?: MDMDomain;
    taskType?: StewardshipTaskType;
    priority?: TaskPriority;
    createdAfter?: Date;
    createdBefore?: Date;
  }): Promise<StewardshipTask[]> {
    return tracer.startActiveSpan('WorkflowEngine.getTasks', async (span) => {
      try {
        let tasks = Array.from(this.tasks.values());

        if (criteria.status) {
          tasks = tasks.filter((t) => t.status === criteria.status);
        }

        if (criteria.assignedTo) {
          tasks = tasks.filter((t) => t.assignedTo === criteria.assignedTo);
        }

        if (criteria.domain) {
          tasks = tasks.filter((t) => t.domain === criteria.domain);
        }

        if (criteria.taskType) {
          tasks = tasks.filter((t) => t.taskType === criteria.taskType);
        }

        if (criteria.priority) {
          tasks = tasks.filter((t) => t.priority === criteria.priority);
        }

        if (criteria.createdAfter) {
          tasks = tasks.filter(
            (t) => t.createdAt >= criteria.createdAfter!
          );
        }

        if (criteria.createdBefore) {
          tasks = tasks.filter(
            (t) => t.createdAt <= criteria.createdBefore!
          );
        }

        span.setAttribute('tasks.count', tasks.length);
        return tasks;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Execute workflow for a task
   */
  async executeWorkflow(
    taskId: string,
    userId: string
  ): Promise<WorkflowExecutionResult> {
    return tracer.startActiveSpan(
      'WorkflowEngine.executeWorkflow',
      async (span) => {
        try {
          span.setAttribute('task.id', taskId);

          const task = this.tasks.get(taskId);
          if (!task) {
            return {
              success: false,
              taskId,
              completedSteps: [],
              errors: ['Task not found'],
              warnings: [],
            };
          }

          const workflow = this.findWorkflow(task.taskType, task.domain);
          if (!workflow) {
            return {
              success: false,
              taskId,
              completedSteps: [],
              errors: ['No workflow found for task type'],
              warnings: [],
            };
          }

          const completedSteps: string[] = [];
          const errors: string[] = [];
          const warnings: string[] = [];

          // Execute workflow steps in order
          for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
            // Check conditions
            if (step.conditions && !this.evaluateConditions(step.conditions, task)) {
              warnings.push(`Step ${step.name} skipped due to conditions`);
              continue;
            }

            // Execute step
            try {
              if (step.type === 'automatic') {
                await this.executeAutomaticStep(step, task);
                completedSteps.push(step.stepId);
              } else {
                // Manual step - check if completed
                const isCompleted = this.isStepCompleted(step, task);
                if (isCompleted) {
                  completedSteps.push(step.stepId);
                } else {
                  // Return and wait for manual completion
                  return {
                    success: false,
                    taskId,
                    currentStep: step,
                    completedSteps,
                    errors,
                    warnings: [...warnings, 'Waiting for manual step completion'],
                  };
                }
              }
            } catch (error) {
              errors.push(
                `Step ${step.name} failed: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }

          // Mark task as completed
          if (errors.length === 0) {
            await this.updateTaskStatus(taskId, 'completed', userId);
          }

          return {
            success: errors.length === 0,
            taskId,
            completedSteps,
            errors,
            warnings,
          };
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Check SLA violations
   */
  async checkSLAViolations(): Promise<SLAViolation[]> {
    return tracer.startActiveSpan(
      'WorkflowEngine.checkSLAViolations',
      async (span) => {
        try {
          const violations: SLAViolation[] = [];
          const now = new Date();

          for (const task of this.tasks.values()) {
            if (task.status === 'completed' || task.status === 'cancelled') {
              continue;
            }

            const workflow = this.findWorkflow(task.taskType, task.domain);
            if (!workflow?.sla) {
              continue;
            }

            // Check response time
            if (!task.assignedAt) {
              const responseTime = this.calculateBusinessMinutes(
                task.createdAt,
                now,
                workflow.sla
              );

              if (responseTime > workflow.sla.responseTime) {
                violations.push({
                  taskId: task.taskId,
                  violationType: 'response_time',
                  expectedTime: workflow.sla.responseTime,
                  actualTime: responseTime,
                  severity: responseTime > workflow.sla.responseTime * 1.5 ? 'critical' : 'warning',
                });
              }
            }

            // Check resolution time
            if (task.dueDate && now > task.dueDate) {
              const resolutionTime = this.calculateBusinessMinutes(
                task.createdAt,
                now,
                workflow.sla
              );

              violations.push({
                taskId: task.taskId,
                violationType: 'resolution_time',
                expectedTime: workflow.sla.resolutionTime,
                actualTime: resolutionTime,
                severity: 'critical',
              });
            }
          }

          span.setAttribute('violations.count', violations.length);
          return violations;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Get task metrics
   */
  async getTaskMetrics(domain?: MDMDomain): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    averageResolutionTime: number;
    slaCompliance: number;
  }> {
    return tracer.startActiveSpan(
      'WorkflowEngine.getTaskMetrics',
      async (span) => {
        try {
          let tasks = Array.from(this.tasks.values());

          if (domain) {
            tasks = tasks.filter((t) => t.domain === domain);
          }

          const byStatus: Record<string, number> = {};
          const byPriority: Record<string, number> = {};

          for (const task of tasks) {
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;
            byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
          }

          // Calculate average resolution time
          const completedTasks = tasks.filter((t) => t.completedAt);
          const totalResolutionTime = completedTasks.reduce((sum, task) => {
            return (
              sum +
              (task.completedAt!.getTime() - task.createdAt.getTime()) / 60000
            );
          }, 0);
          const averageResolutionTime =
            completedTasks.length > 0
              ? totalResolutionTime / completedTasks.length
              : 0;

          // Calculate SLA compliance
          const tasksWithSLA = tasks.filter((t) => t.dueDate);
          const slaCompliant = tasksWithSLA.filter(
            (t) =>
              !t.dueDate ||
              (t.completedAt && t.completedAt <= t.dueDate) ||
              (!t.completedAt && new Date() <= t.dueDate)
          );
          const slaCompliance =
            tasksWithSLA.length > 0
              ? (slaCompliant.length / tasksWithSLA.length) * 100
              : 100;

          return {
            total: tasks.length,
            byStatus: byStatus as Record<TaskStatus, number>,
            byPriority: byPriority as Record<TaskPriority, number>,
            averageResolutionTime: Math.round(averageResolutionTime),
            slaCompliance: Math.round(slaCompliance * 100) / 100,
          };
        } finally {
          span.end();
        }
      }
    );
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Validate workflow definition
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.workflowId || !workflow.name) {
      throw new Error('Workflow must have ID and name');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate step order
    const orders = workflow.steps.map((s) => s.order);
    if (new Set(orders).size !== orders.length) {
      throw new Error('Workflow steps must have unique order values');
    }
  }

  /**
   * Find applicable workflow for task
   */
  private findWorkflow(
    taskType: StewardshipTaskType,
    domain: MDMDomain
  ): WorkflowDefinition | undefined {
    for (const workflow of this.workflows.values()) {
      if (
        workflow.taskType === taskType &&
        workflow.domain === domain &&
        workflow.isActive
      ) {
        return workflow;
      }
    }
    return undefined;
  }

  /**
   * Auto-assign task based on rules
   */
  private async autoAssignTask(
    task: StewardshipTask,
    assignmentRules?: AssignmentRule[]
  ): Promise<string | undefined> {
    if (!assignmentRules || assignmentRules.length === 0) {
      return undefined;
    }

    // Sort rules by priority
    const sortedRules = [...assignmentRules].sort(
      (a, b) => a.priority - b.priority
    );

    for (const rule of sortedRules) {
      // Check conditions
      if (rule.conditions && !this.evaluateConditions(rule.conditions, task)) {
        continue;
      }

      // Get assignee
      const assignee = Array.isArray(rule.assignTo)
        ? this.selectUserByWorkload(rule.assignTo, rule.balanceLoad)
        : rule.assignTo;

      return assignee;
    }

    return undefined;
  }

  /**
   * Select user by workload
   */
  private selectUserByWorkload(
    users: string[],
    balanceLoad: boolean
  ): string {
    if (!balanceLoad) {
      return users[0];
    }

    // Count current tasks per user
    const workload = new Map<string, number>();
    for (const user of users) {
      workload.set(user, 0);
    }

    for (const task of this.tasks.values()) {
      if (
        task.assignedTo &&
        users.includes(task.assignedTo) &&
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      ) {
        workload.set(task.assignedTo, (workload.get(task.assignedTo) || 0) + 1);
      }
    }

    // Return user with lowest workload
    let minWorkload = Infinity;
    let selectedUser = users[0];

    for (const [user, count] of workload) {
      if (count < minWorkload && count < this.config.maxTasksPerUser) {
        minWorkload = count;
        selectedUser = user;
      }
    }

    return selectedUser;
  }

  /**
   * Setup escalation for task
   */
  private setupEscalation(
    task: StewardshipTask,
    escalationRules: EscalationRule[]
  ): void {
    for (const rule of escalationRules) {
      const timer = setTimeout(() => {
        this.escalateTask(task, rule);
      }, rule.triggerAfter * 60 * 1000);

      this.taskTimers.set(`${task.taskId}-${rule.ruleId}`, timer);
    }
  }

  /**
   * Escalate task
   */
  private async escalateTask(
    task: StewardshipTask,
    rule: EscalationRule
  ): Promise<void> {
    task.status = 'escalated';
    task.updatedAt = new Date();

    await this.addTaskComment(
      task.taskId,
      'system',
      `Task escalated due to: ${rule.triggerAfter} minutes elapsed`
    );

    if (this.config.enableNotifications && rule.notificationChannels) {
      await this.sendNotification(
        task,
        rule.message || 'Task has been escalated'
      );
    }
  }

  /**
   * Cancel task timer
   */
  private cancelTaskTimer(taskId: string): void {
    for (const [key, timer] of this.taskTimers) {
      if (key.startsWith(taskId)) {
        clearTimeout(timer);
        this.taskTimers.delete(key);
      }
    }
  }

  /**
   * Calculate SLA deadline
   */
  private calculateSLADeadline(
    startDate: Date,
    minutes: number,
    sla: SLAConfig
  ): Date {
    if (!sla.businessHoursOnly) {
      return new Date(startDate.getTime() + minutes * 60 * 1000);
    }

    // Calculate business hours (simplified - would need proper business hours logic)
    const deadline = new Date(startDate);
    let remainingMinutes = minutes;

    while (remainingMinutes > 0) {
      deadline.setMinutes(deadline.getMinutes() + 1);
      remainingMinutes--;

      // Skip weekends if configured
      if (sla.excludeWeekends) {
        const day = deadline.getDay();
        if (day === 0 || day === 6) {
          continue;
        }
      }
    }

    return deadline;
  }

  /**
   * Calculate business minutes between dates
   */
  private calculateBusinessMinutes(
    start: Date,
    end: Date,
    sla: SLAConfig
  ): number {
    const totalMinutes = (end.getTime() - start.getTime()) / 60000;

    if (!sla.businessHoursOnly) {
      return totalMinutes;
    }

    // Simplified - would need proper business hours logic
    return totalMinutes * 0.4; // Rough approximation
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(
    conditions: WorkflowCondition[],
    task: StewardshipTask
  ): boolean {
    for (const condition of conditions) {
      const value = (task as Record<string, unknown>)[condition.field];

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'contains':
          if (
            typeof value !== 'string' ||
            !value.includes(String(condition.value))
          )
            return false;
          break;
        case 'greater_than':
          if (Number(value) <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (Number(value) >= Number(condition.value)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Execute automatic workflow step
   */
  private async executeAutomaticStep(
    step: WorkflowStep,
    task: StewardshipTask
  ): Promise<void> {
    // In a real implementation, this would execute the step action
    // For now, just log it
    await this.addTaskComment(
      task.taskId,
      'system',
      `Executed automatic step: ${step.name}`
    );
  }

  /**
   * Check if step is completed
   */
  private isStepCompleted(
    step: WorkflowStep,
    task: StewardshipTask
  ): boolean {
    // In a real implementation, check task metadata for step completion
    return false;
  }

  /**
   * Send notification
   */
  private async sendNotification(
    task: StewardshipTask,
    message: string
  ): Promise<void> {
    // In a real implementation, send notifications via configured channels
    // For now, just add to task metadata
    if (!task.metadata) {
      task.metadata = {};
    }
    if (!task.metadata.notifications) {
      task.metadata.notifications = [];
    }
    (task.metadata.notifications as unknown[]).push({
      message,
      timestamp: new Date(),
      channels: this.config.notificationChannels,
    });
  }

  /**
   * Clear all tasks and workflows (for testing)
   */
  clearAll(): void {
    this.tasks.clear();
    this.workflows.clear();
    for (const timer of this.taskTimers.values()) {
      clearTimeout(timer);
    }
    this.taskTimers.clear();
  }
}
