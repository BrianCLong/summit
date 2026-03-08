// @ts-nocheck
/**
 * Case Workflow Service - Main business logic layer for case workflow engine
 * Integrates state machine, SLA tracking, tasks, participants, and approvals
 */

import { Pool } from 'pg';
import logger from '../../config/logger.js';
import { WorkflowStateMachine } from './StateMachine.js';
import { SLATracker } from './SLATracker.js';
import { TaskRepo } from './repos/TaskRepo.js';
import { ParticipantRepo } from './repos/ParticipantRepo.js';
import { ApprovalRepo } from './repos/ApprovalRepo.js';
import { CaseRepo } from '../../repos/CaseRepo.js';
import { AuditAccessLogRepo, type LegalBasis } from '../../repos/AuditAccessLogRepo.js';
import {
  CaseWithWorkflow,
  CaseTask,
  CaseTaskInput,
  CaseTaskUpdateInput,
  CaseParticipantInput,
  CaseApprovalInput,
  CaseApprovalVoteInput,
  CaseSLAInput,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  CaseListFilters,
  TaskListFilters,
  CaseEvent,
  CaseEventType,
} from './types.js';

const serviceLogger = logger.child({ name: 'CaseWorkflowService' });

export type EventHandler = (event: CaseEvent) => Promise<void> | void;

export class CaseWorkflowService {
  private stateMachine: WorkflowStateMachine;
  private slaTracker: SLATracker;
  private taskRepo: TaskRepo;
  private participantRepo: ParticipantRepo;
  private approvalRepo: ApprovalRepo;
  private caseRepo: CaseRepo;
  private auditRepo: AuditAccessLogRepo;
  private eventHandlers: Map<CaseEventType, EventHandler[]> = new Map();

  constructor(private pg: Pool) {
    this.stateMachine = new WorkflowStateMachine(pg);
    this.slaTracker = new SLATracker(pg);
    this.taskRepo = new TaskRepo(pg);
    this.participantRepo = new ParticipantRepo(pg);
    this.approvalRepo = new ApprovalRepo(pg);
    this.caseRepo = new CaseRepo(pg);
    this.auditRepo = new AuditAccessLogRepo(pg);
  }

  // ==================== CASE MANAGEMENT ====================

  /**
   * Get case with workflow data
   */
  async getCase(
    caseId: string,
    tenantId: string,
    options?: {
      includeParticipants?: boolean;
      includeTasks?: boolean;
      includeSLAs?: boolean;
      includeApprovals?: boolean;
      includeHistory?: boolean;
    },
  ): Promise<CaseWithWorkflow | null> {
    const baseCase = await this.caseRepo.findById(caseId, tenantId);
    if (!baseCase) return null;

    const caseWithWorkflow: CaseWithWorkflow = {
      ...baseCase,
      priority: baseCase.priority,
      caseType: 'investigation',
      tags: [],
    };

    // Load related data based on options
    if (options?.includeParticipants) {
      caseWithWorkflow.participants = await this.participantRepo.getCaseParticipants(
        caseId,
      );
    }

    if (options?.includeTasks) {
      caseWithWorkflow.tasks = await this.taskRepo.getCaseTasks(caseId);
    }

    if (options?.includeSLAs) {
      caseWithWorkflow.slas = await this.slaTracker.getCaseSLAs(caseId);
    }

    if (options?.includeApprovals) {
      caseWithWorkflow.approvals = await this.approvalRepo.getCaseApprovals(caseId);
    }

    // Load current stage info
    if (caseWithWorkflow.currentStage) {
      caseWithWorkflow.currentStageInfo = await this.stateMachine.getStage(
        caseWithWorkflow.caseType,
        caseWithWorkflow.currentStage,
      ) || undefined;
    }

    return caseWithWorkflow;
  }

  /**
   * List cases with filters
   */
  async listCases(filters: CaseListFilters): Promise<CaseWithWorkflow[]> {
    // Use base case repo for now, can be extended with more complex queries
    const baseCases = await this.caseRepo.list({
      tenantId: filters.tenantId,
      status: Array.isArray(filters.status) ? filters.status[0] : filters.status,
      compartment: undefined,
      policyLabels: filters.tags,
      limit: filters.limit,
      offset: filters.offset,
    });

    return baseCases.map((c) => ({
      ...c,
      priority: c.priority,
      caseType: 'investigation',
      tags: [],
    }));
  }

  // ==================== WORKFLOW TRANSITIONS ====================

  /**
   * Transition case to new stage
   */
  async transitionStage(
    request: WorkflowTransitionRequest,
    auditContext: {
      legalBasis: LegalBasis;
      correlationId?: string;
      tenantId: string;
    },
  ): Promise<WorkflowTransitionResult> {
    if (!auditContext.tenantId) {
      return {
        success: false,
        errors: ['Tenant ID is required'],
      };
    }

    const caseData = await this.getCase(request.caseId, auditContext.tenantId);
    if (!caseData) {
      return {
        success: false,
        errors: ['Case not found'],
      };
    }

    // Get user roles
    const userRoles = await this.participantRepo.getUserRoleIds(
      request.caseId,
      request.userId,
    );

    // Execute transition
    const result = await this.stateMachine.executeTransition(
      request,
      caseData,
      userRoles,
    );

    // Emit event
    if (result.success) {
      await this.emitEvent({
        type: 'case.stage_changed',
        caseId: request.caseId,
        tenantId: caseData.tenantId,
        userId: request.userId,
        timestamp: new Date(),
        data: {
          fromStage: caseData.currentStage,
          toStage: request.toStage,
          reason: request.reason,
        },
      });

      // Log audit trail
      await this.auditRepo.logAccess({
        tenantId: caseData.tenantId,
        caseId: request.caseId,
        userId: request.userId,
        action: 'stage_transition',
        resourceType: 'case',
        resourceId: request.caseId,
        reason: request.reason,
        legalBasis: auditContext.legalBasis,
        correlationId: auditContext.correlationId,
        metadata: {
          fromStage: caseData.currentStage,
          toStage: request.toStage,
        },
      });
    }

    return result;
  }

  /**
   * Get available transitions for a case
   */
  async getAvailableTransitions(
    caseId: string,
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const caseData = await this.getCase(caseId, tenantId);
    if (!caseData) return [];

    const userRoles = await this.participantRepo.getUserRoleIds(caseId, userId);

    return this.stateMachine.getAvailableTransitions(caseData, userRoles);
  }

  // ==================== TASK MANAGEMENT ====================

  /**
   * Create a task
   */
  async createTask(
    input: CaseTaskInput,
    auditContext: {
      legalBasis: string;
      reason: string;
      tenantId: string;
    },
  ): Promise<CaseTask> {
    if (!auditContext.tenantId) {
      throw new Error('Tenant ID is required');
    }

    const task = await this.taskRepo.create(input);

    // Create SLA if due date is set
    if (input.dueDate) {
      const now = new Date();
      const targetHours = Math.ceil(
        (input.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60),
      );

      if (targetHours > 0) {
        await this.slaTracker.createSLA({
          caseId: input.caseId,
          slaType: 'task_completion',
          targetEntityId: task.id,
          targetHours,
          metadata: { taskId: task.id },
        });
      }
    }

    await this.emitEvent({
      type: 'task.created',
      caseId: input.caseId,
      tenantId: auditContext.tenantId,
      userId: input.createdBy,
      timestamp: new Date(),
      data: { task },
    });

    return task;
  }

  /**
   * Assign task to user
   */
  async assignTask(
    taskId: string,
    userId: string,
    assignedBy: string,
    tenantId: string,
  ): Promise<CaseTask | null> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const task = await this.taskRepo.assignTask(taskId, userId, assignedBy);

    if (task) {
      await this.emitEvent({
        type: 'task.assigned',
        caseId: task.caseId,
        tenantId,
        userId: assignedBy,
        timestamp: new Date(),
        data: { task, assignedTo: userId },
      });
    }

    return task;
  }

  /**
   * Complete task
   */
  async completeTask(
    taskId: string,
    userId: string,
    tenantId: string,
    resultData?: Record<string, unknown>,
  ): Promise<CaseTask | null> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const task = await this.taskRepo.completeTask(taskId, userId, resultData);

    if (task) {
      // Mark task SLA as met
      const slas = await this.slaTracker.getCaseSLAs(task.caseId, 'active');
      const taskSLA = slas.find(
        (s) => s.slaType === 'task_completion' && s.targetEntityId === taskId,
      );

      if (taskSLA) {
        await this.slaTracker.markSLAMet(taskSLA.id);
      }

      await this.emitEvent({
        type: 'task.completed',
        caseId: task.caseId,
        tenantId,
        userId,
        timestamp: new Date(),
        data: { task, resultData },
      });
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(input: CaseTaskUpdateInput): Promise<CaseTask | null> {
    return this.taskRepo.update(input);
  }

  /**
   * List tasks
   */
  async listTasks(filters: TaskListFilters): Promise<CaseTask[]> {
    return this.taskRepo.list(filters);
  }

  /**
   * Get overdue tasks for a case
   */
  async getOverdueTasks(caseId: string): Promise<CaseTask[]> {
    return this.taskRepo.getOverdueTasks(caseId) as Promise<CaseTask[]>;
  }

  // ==================== PARTICIPANT MANAGEMENT ====================

  /**
   * Add participant to case
   */
  async addParticipant(input: CaseParticipantInput, tenantId: string): Promise<unknown> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const participant = await this.participantRepo.addParticipant(input);

    await this.emitEvent({
      type: 'case.participant_added',
      caseId: input.caseId,
      tenantId,
      userId: input.assignedBy || 'system',
      timestamp: new Date(),
      data: { participant },
    });

    return participant;
  }

  /**
   * Remove participant from case
   */
  async removeParticipant(
    caseId: string,
    userId: string,
    roleId: string,
    removedBy: string,
    tenantId: string,
  ): Promise<unknown> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const participant = await this.participantRepo.removeParticipant(
      caseId,
      userId,
      roleId,
      removedBy,
    );

    if (participant) {
      await this.emitEvent({
        type: 'case.participant_removed',
        caseId,
        tenantId,
        userId: removedBy,
        timestamp: new Date(),
        data: { participant },
      });
    }

    return participant;
  }

  /**
   * Get case participants
   */
  async getCaseParticipants(caseId: string): Promise<unknown[]> {
    return this.participantRepo.getCaseParticipants(caseId);
  }

  // ==================== APPROVAL MANAGEMENT ====================

  /**
   * Request approval
   */
  async requestApproval(input: CaseApprovalInput, tenantId: string): Promise<unknown> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const approval = await this.approvalRepo.createApproval(input);

    await this.emitEvent({
      type: 'approval.requested',
      caseId: input.caseId,
      tenantId,
      userId: input.requestedBy,
      timestamp: new Date(),
      data: { approval },
    });

    return approval;
  }

  /**
   * Submit approval vote
   */
  async submitApprovalVote(input: CaseApprovalVoteInput, tenantId: string): Promise<unknown> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const vote = await this.approvalRepo.submitVote(input);

    // Check if approval is complete
    const checkResult = await this.approvalRepo.checkApprovalComplete(
      input.approvalId,
    );

    const approval = await this.approvalRepo.getApproval(input.approvalId);

    if (checkResult.isComplete && approval) {
      await this.approvalRepo.updateApprovalStatus(
        input.approvalId,
        checkResult.status,
      );

      const eventType: CaseEventType =
        checkResult.status === 'approved'
          ? 'approval.approved'
          : 'approval.rejected';

      await this.emitEvent({
        type: eventType,
        caseId: approval.caseId,
        tenantId,
        userId: input.approverUserId,
        timestamp: new Date(),
        data: { approval, vote, checkResult },
      });
    }

    return vote;
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId: string): Promise<unknown[]> {
    return this.approvalRepo.getPendingApprovalsForUser(userId);
  }

  // ==================== SLA MANAGEMENT ====================

  /**
   * Create SLA
   */
  async createSLA(input: CaseSLAInput): Promise<unknown> {
    return this.slaTracker.createSLA(input);
  }

  /**
   * Get case SLAs
   */
  async getCaseSLAs(caseId: string): Promise<unknown[]> {
    return this.slaTracker.getCaseSLAs(caseId);
  }

  /**
   * Get SLA summary
   */
  async getCaseSLASummary(caseId: string): Promise<unknown> {
    return this.slaTracker.getCaseSLASummary(caseId);
  }

  /**
   * Check for breached SLAs (run periodically)
   * Note: For system-level SLA checks, tenantId should be derived from the case
   */
  async checkBreachedSLAs(): Promise<unknown[]> {
    const events = await this.slaTracker.checkBreachedSLAs();

    for (const event of events) {
      // For system checks, we need to fetch the case to get the tenantId
      // This is acceptable as these are background jobs
      const caseData = await this.caseRepo.findById(event.caseId, 'system');
      const tenantId = caseData?.tenantId || 'system';

      await this.emitEvent({
        type: 'sla.breached',
        caseId: event.caseId,
        tenantId,
        userId: 'system',
        timestamp: new Date(),
        data: event,
      });
    }

    return events;
  }

  /**
   * Check for at-risk SLAs (run periodically)
   * Note: For system-level SLA checks, tenantId should be derived from the case
   */
  async checkAtRiskSLAs(): Promise<unknown[]> {
    const events = await this.slaTracker.checkAtRiskSLAs();

    for (const event of events) {
      // For system checks, we need to fetch the case to get the tenantId
      // This is acceptable as these are background jobs
      const caseData = await this.caseRepo.findById(event.caseId, 'system');
      const tenantId = caseData?.tenantId || 'system';

      await this.emitEvent({
        type: 'sla.at_risk',
        caseId: event.caseId,
        tenantId,
        userId: 'system',
        timestamp: new Date(),
        data: event,
      });
    }

    return events;
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Get all roles
   */
  async listRoles(systemOnly = false): Promise<unknown[]> {
    return this.participantRepo.listRoles(systemOnly);
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<unknown | null> {
    return this.participantRepo.getRoleByName(name);
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Register an event handler
   */
  on(eventType: CaseEventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit an event
   */
  private async emitEvent(event: CaseEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];

    serviceLogger.debug(
      {
        type: event.type,
        caseId: event.caseId,
        handlerCount: handlers.length,
      },
      'Emitting event',
    );

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error: any) {
        serviceLogger.error(
          {
            error,
            eventType: event.type,
            caseId: event.caseId,
          },
          'Event handler failed',
        );
      }
    }
  }
}
