"use strict";
/**
 * Approval Workflow Service
 * Manages term approval workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalWorkflowService = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class ApprovalWorkflowService {
    workflowStore;
    glossaryStore;
    constructor(workflowStore, glossaryStore) {
        this.workflowStore = workflowStore;
        this.glossaryStore = glossaryStore;
    }
    /**
     * Create approval workflow for term
     */
    async createWorkflow(termId, requestedBy, approvers) {
        const workflow = {
            id: this.generateWorkflowId(termId),
            termId,
            requestedBy,
            requestedAt: new Date(),
            approvers,
            currentApprover: approvers[0] || null,
            status: data_catalog_1.ApprovalStatus.PENDING,
            comments: [],
            completedAt: null,
        };
        return this.workflowStore.createWorkflow(workflow);
    }
    /**
     * Approve term
     */
    async approve(workflowId, approverId, comment = '') {
        const workflow = await this.workflowStore.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        if (workflow.status !== data_catalog_1.ApprovalStatus.PENDING) {
            throw new Error('Workflow is not pending');
        }
        if (!workflow.approvers.includes(approverId)) {
            throw new Error('User is not an approver');
        }
        // Add approval comment
        const approvalComment = {
            id: this.generateCommentId(),
            author: approverId,
            comment,
            action: data_catalog_1.ApprovalAction.APPROVE,
            createdAt: new Date(),
        };
        // Update workflow
        const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
            status: data_catalog_1.ApprovalStatus.APPROVED,
            completedAt: new Date(),
            comments: [...workflow.comments, approvalComment],
        });
        // Update term
        await this.glossaryStore.updateTerm(workflow.termId, {
            approvalStatus: data_catalog_1.ApprovalStatus.APPROVED,
            approvedBy: approverId,
            approvedAt: new Date(),
        });
        return updatedWorkflow;
    }
    /**
     * Reject term
     */
    async reject(workflowId, approverId, reason) {
        const workflow = await this.workflowStore.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        if (workflow.status !== data_catalog_1.ApprovalStatus.PENDING) {
            throw new Error('Workflow is not pending');
        }
        if (!workflow.approvers.includes(approverId)) {
            throw new Error('User is not an approver');
        }
        // Add rejection comment
        const rejectionComment = {
            id: this.generateCommentId(),
            author: approverId,
            comment: reason,
            action: data_catalog_1.ApprovalAction.REJECT,
            createdAt: new Date(),
        };
        // Update workflow
        const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
            status: data_catalog_1.ApprovalStatus.REJECTED,
            completedAt: new Date(),
            comments: [...workflow.comments, rejectionComment],
        });
        // Update term
        await this.glossaryStore.updateTerm(workflow.termId, {
            approvalStatus: data_catalog_1.ApprovalStatus.REJECTED,
        });
        return updatedWorkflow;
    }
    /**
     * Request changes
     */
    async requestChanges(workflowId, approverId, changes) {
        const workflow = await this.workflowStore.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        if (workflow.status !== data_catalog_1.ApprovalStatus.PENDING) {
            throw new Error('Workflow is not pending');
        }
        if (!workflow.approvers.includes(approverId)) {
            throw new Error('User is not an approver');
        }
        // Add changes request comment
        const changesComment = {
            id: this.generateCommentId(),
            author: approverId,
            comment: changes,
            action: data_catalog_1.ApprovalAction.REQUEST_CHANGES,
            createdAt: new Date(),
        };
        // Update workflow
        const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
            status: data_catalog_1.ApprovalStatus.CHANGES_REQUESTED,
            comments: [...workflow.comments, changesComment],
        });
        // Update term
        await this.glossaryStore.updateTerm(workflow.termId, {
            approvalStatus: data_catalog_1.ApprovalStatus.CHANGES_REQUESTED,
        });
        return updatedWorkflow;
    }
    /**
     * Add comment to workflow
     */
    async addComment(workflowId, userId, comment) {
        const workflow = await this.workflowStore.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        const newComment = {
            id: this.generateCommentId(),
            author: userId,
            comment,
            action: data_catalog_1.ApprovalAction.COMMENT,
            createdAt: new Date(),
        };
        return this.workflowStore.updateWorkflow(workflowId, {
            comments: [...workflow.comments, newComment],
        });
    }
    /**
     * Get workflows for term
     */
    async getWorkflowsForTerm(termId) {
        return this.workflowStore.getWorkflowsForTerm(termId);
    }
    /**
     * Generate workflow ID
     */
    generateWorkflowId(termId) {
        return `workflow-${termId}-${Date.now()}`;
    }
    /**
     * Generate comment ID
     */
    generateCommentId() {
        return `comment-${Date.now()}`;
    }
}
exports.ApprovalWorkflowService = ApprovalWorkflowService;
