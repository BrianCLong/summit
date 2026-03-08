"use strict";
// @ts-nocheck
/**
 * Case Workflow Service - Main business logic layer for case workflow engine
 * Integrates state machine, SLA tracking, tasks, participants, and approvals
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseWorkflowService = void 0;
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const StateMachine_js_1 = require("./StateMachine.js");
const SLATracker_js_1 = require("./SLATracker.js");
const TaskRepo_js_1 = require("./repos/TaskRepo.js");
const ParticipantRepo_js_1 = require("./repos/ParticipantRepo.js");
const ApprovalRepo_js_1 = require("./repos/ApprovalRepo.js");
const CaseRepo_js_1 = require("../../repos/CaseRepo.js");
const AuditAccessLogRepo_js_1 = require("../../repos/AuditAccessLogRepo.js");
const serviceLogger = logger_js_1.default.child({ name: 'CaseWorkflowService' });
class CaseWorkflowService {
    pg;
    stateMachine;
    slaTracker;
    taskRepo;
    participantRepo;
    approvalRepo;
    caseRepo;
    auditRepo;
    eventHandlers = new Map();
    constructor(pg) {
        this.pg = pg;
        this.stateMachine = new StateMachine_js_1.WorkflowStateMachine(pg);
        this.slaTracker = new SLATracker_js_1.SLATracker(pg);
        this.taskRepo = new TaskRepo_js_1.TaskRepo(pg);
        this.participantRepo = new ParticipantRepo_js_1.ParticipantRepo(pg);
        this.approvalRepo = new ApprovalRepo_js_1.ApprovalRepo(pg);
        this.caseRepo = new CaseRepo_js_1.CaseRepo(pg);
        this.auditRepo = new AuditAccessLogRepo_js_1.AuditAccessLogRepo(pg);
    }
    // ==================== CASE MANAGEMENT ====================
    /**
     * Get case with workflow data
     */
    async getCase(caseId, tenantId, options) {
        const baseCase = await this.caseRepo.findById(caseId, tenantId);
        if (!baseCase)
            return null;
        const caseWithWorkflow = {
            ...baseCase,
            priority: baseCase.priority,
            caseType: 'investigation',
            tags: [],
        };
        // Load related data based on options
        if (options?.includeParticipants) {
            caseWithWorkflow.participants = await this.participantRepo.getCaseParticipants(caseId);
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
            caseWithWorkflow.currentStageInfo = await this.stateMachine.getStage(caseWithWorkflow.caseType, caseWithWorkflow.currentStage) || undefined;
        }
        return caseWithWorkflow;
    }
    /**
     * List cases with filters
     */
    async listCases(filters) {
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
    async transitionStage(request, auditContext) {
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
        const userRoles = await this.participantRepo.getUserRoleIds(request.caseId, request.userId);
        // Execute transition
        const result = await this.stateMachine.executeTransition(request, caseData, userRoles);
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
    async getAvailableTransitions(caseId, userId, tenantId) {
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        const caseData = await this.getCase(caseId, tenantId);
        if (!caseData)
            return [];
        const userRoles = await this.participantRepo.getUserRoleIds(caseId, userId);
        return this.stateMachine.getAvailableTransitions(caseData, userRoles);
    }
    // ==================== TASK MANAGEMENT ====================
    /**
     * Create a task
     */
    async createTask(input, auditContext) {
        if (!auditContext.tenantId) {
            throw new Error('Tenant ID is required');
        }
        const task = await this.taskRepo.create(input);
        // Create SLA if due date is set
        if (input.dueDate) {
            const now = new Date();
            const targetHours = Math.ceil((input.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
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
    async assignTask(taskId, userId, assignedBy, tenantId) {
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
    async completeTask(taskId, userId, tenantId, resultData) {
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        const task = await this.taskRepo.completeTask(taskId, userId, resultData);
        if (task) {
            // Mark task SLA as met
            const slas = await this.slaTracker.getCaseSLAs(task.caseId, 'active');
            const taskSLA = slas.find((s) => s.slaType === 'task_completion' && s.targetEntityId === taskId);
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
    async updateTask(input) {
        return this.taskRepo.update(input);
    }
    /**
     * List tasks
     */
    async listTasks(filters) {
        return this.taskRepo.list(filters);
    }
    /**
     * Get overdue tasks for a case
     */
    async getOverdueTasks(caseId) {
        return this.taskRepo.getOverdueTasks(caseId);
    }
    // ==================== PARTICIPANT MANAGEMENT ====================
    /**
     * Add participant to case
     */
    async addParticipant(input, tenantId) {
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
    async removeParticipant(caseId, userId, roleId, removedBy, tenantId) {
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        const participant = await this.participantRepo.removeParticipant(caseId, userId, roleId, removedBy);
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
    async getCaseParticipants(caseId) {
        return this.participantRepo.getCaseParticipants(caseId);
    }
    // ==================== APPROVAL MANAGEMENT ====================
    /**
     * Request approval
     */
    async requestApproval(input, tenantId) {
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
    async submitApprovalVote(input, tenantId) {
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        const vote = await this.approvalRepo.submitVote(input);
        // Check if approval is complete
        const checkResult = await this.approvalRepo.checkApprovalComplete(input.approvalId);
        const approval = await this.approvalRepo.getApproval(input.approvalId);
        if (checkResult.isComplete && approval) {
            await this.approvalRepo.updateApprovalStatus(input.approvalId, checkResult.status);
            const eventType = checkResult.status === 'approved'
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
    async getPendingApprovalsForUser(userId) {
        return this.approvalRepo.getPendingApprovalsForUser(userId);
    }
    // ==================== SLA MANAGEMENT ====================
    /**
     * Create SLA
     */
    async createSLA(input) {
        return this.slaTracker.createSLA(input);
    }
    /**
     * Get case SLAs
     */
    async getCaseSLAs(caseId) {
        return this.slaTracker.getCaseSLAs(caseId);
    }
    /**
     * Get SLA summary
     */
    async getCaseSLASummary(caseId) {
        return this.slaTracker.getCaseSLASummary(caseId);
    }
    /**
     * Check for breached SLAs (run periodically)
     * Note: For system-level SLA checks, tenantId should be derived from the case
     */
    async checkBreachedSLAs() {
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
    async checkAtRiskSLAs() {
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
    async listRoles(systemOnly = false) {
        return this.participantRepo.listRoles(systemOnly);
    }
    /**
     * Get role by name
     */
    async getRoleByName(name) {
        return this.participantRepo.getRoleByName(name);
    }
    // ==================== EVENT SYSTEM ====================
    /**
     * Register an event handler
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }
    /**
     * Emit an event
     */
    async emitEvent(event) {
        const handlers = this.eventHandlers.get(event.type) || [];
        serviceLogger.debug({
            type: event.type,
            caseId: event.caseId,
            handlerCount: handlers.length,
        }, 'Emitting event');
        for (const handler of handlers) {
            try {
                await handler(event);
            }
            catch (error) {
                serviceLogger.error({
                    error,
                    eventType: event.type,
                    caseId: event.caseId,
                }, 'Event handler failed');
            }
        }
    }
}
exports.CaseWorkflowService = CaseWorkflowService;
