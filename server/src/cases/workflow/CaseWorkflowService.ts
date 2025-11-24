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
import { CaseRepo } from '../CaseRepo.js';
import { AuditAccessLogRepo } from '../../repos/AuditAccessLogRepo.js';
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
      priority: 'medium', // These come from extended fields in cases table
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
      priority: 'medium',
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
      legalBasis: string;
      correlationId?: string;
    },
  ): Promise<WorkflowTransitionResult> {
    const caseData = await this.getCase(request.caseId, ''); // TODO: get tenant from context
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
  ): Promise<string[]> {
    const caseData = await this.getCase(caseId, '');
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
    },
  ): Promise<CaseTask> {
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
      tenantId: '', // TODO: get from case
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
  ): Promise<CaseTask | null> {
    const task = await this.taskRepo.assignTask(taskId, userId, assignedBy);

    if (task) {
      await this.emitEvent({
        type: 'task.assigned',
        caseId: task.caseId,
        tenantId: '',
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
    resultData?: Record<string, any>,
  ): Promise<CaseTask | null> {
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
        tenantId: '',
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
  async getOverdueTasks(caseId: string) {
    return this.taskRepo.getOverdueTasks(caseId);
  }

  // ==================== PARTICIPANT MANAGEMENT ====================

  /**
   * Add participant to case
   */
  async addParticipant(input: CaseParticipantInput) {
    const participant = await this.participantRepo.addParticipant(input);

    await this.emitEvent({
      type: 'case.participant_added',
      caseId: input.caseId,
      tenantId: '',
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
  ) {
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
        tenantId: '',
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
  async getCaseParticipants(caseId: string) {
    return this.participantRepo.getCaseParticipants(caseId);
  }

  // ==================== APPROVAL MANAGEMENT ====================

  /**
   * Request approval
   */
  async requestApproval(input: CaseApprovalInput) {
    const approval = await this.approvalRepo.createApproval(input);

    await this.emitEvent({
      type: 'approval.requested',
      caseId: input.caseId,
      tenantId: '',
      userId: input.requestedBy,
      timestamp: new Date(),
      data: { approval },
    });

    return approval;
  }

  /**
   * Submit approval vote
   */
  async submitApprovalVote(input: CaseApprovalVoteInput) {
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
        tenantId: '',
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
  async getPendingApprovalsForUser(userId: string) {
    return this.approvalRepo.getPendingApprovalsForUser(userId);
  }

  // ==================== SLA MANAGEMENT ====================

  /**
   * Create SLA
   */
  async createSLA(input: CaseSLAInput) {
    return this.slaTracker.createSLA(input);
  }

  /**
   * Get case SLAs
   */
  async getCaseSLAs(caseId: string) {
    return this.slaTracker.getCaseSLAs(caseId);
  }

  /**
   * Get SLA summary
   */
  async getCaseSLASummary(caseId: string) {
    return this.slaTracker.getCaseSLASummary(caseId);
  }

  /**
   * Check for breached SLAs (run periodically)
   */
  async checkBreachedSLAs() {
    const events = await this.slaTracker.checkBreachedSLAs();

    for (const event of events) {
      await this.emitEvent({
        type: 'sla.breached',
        caseId: event.caseId,
        tenantId: '',
        userId: 'system',
        timestamp: new Date(),
        data: event,
      });
    }

    return events;
  }

  /**
   * Check for at-risk SLAs (run periodically)
   */
  async checkAtRiskSLAs() {
    const events = await this.slaTracker.checkAtRiskSLAs();

    for (const event of events) {
      await this.emitEvent({
        type: 'sla.at_risk',
        caseId: event.caseId,
        tenantId: '',
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
  async listRoles(systemOnly = false) {
    return this.participantRepo.listRoles(systemOnly);
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string) {
    return this.participantRepo.getRoleByName(name);
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Register an event handler
   */
  on(eventType: CaseEventType, handler: EventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Emit an event
   */
  private async emitEvent(event: CaseEvent) {
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
      } catch (error) {
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
