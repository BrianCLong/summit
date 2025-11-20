/**
 * Approval Workflow Service
 * Manages term approval workflows
 */

import {
  ApprovalWorkflow,
  ApprovalStatus,
  ApprovalComment,
  ApprovalAction,
  GlossaryTerm,
} from '@intelgraph/data-catalog';

export interface IApprovalWorkflowStore {
  getWorkflow(id: string): Promise<ApprovalWorkflow | null>;
  createWorkflow(workflow: ApprovalWorkflow): Promise<ApprovalWorkflow>;
  updateWorkflow(id: string, workflow: Partial<ApprovalWorkflow>): Promise<ApprovalWorkflow>;
  getWorkflowsForTerm(termId: string): Promise<ApprovalWorkflow[]>;
}

export interface IGlossaryStore {
  getTerm(id: string): Promise<GlossaryTerm | null>;
  updateTerm(id: string, updates: Partial<GlossaryTerm>): Promise<GlossaryTerm>;
}

export class ApprovalWorkflowService {
  constructor(
    private workflowStore: IApprovalWorkflowStore,
    private glossaryStore: IGlossaryStore
  ) {}

  /**
   * Create approval workflow for term
   */
  async createWorkflow(
    termId: string,
    requestedBy: string,
    approvers: string[]
  ): Promise<ApprovalWorkflow> {
    const workflow: ApprovalWorkflow = {
      id: this.generateWorkflowId(termId),
      termId,
      requestedBy,
      requestedAt: new Date(),
      approvers,
      currentApprover: approvers[0] || null,
      status: ApprovalStatus.PENDING,
      comments: [],
      completedAt: null,
    };

    return this.workflowStore.createWorkflow(workflow);
  }

  /**
   * Approve term
   */
  async approve(workflowId: string, approverId: string, comment: string = ''): Promise<ApprovalWorkflow> {
    const workflow = await this.workflowStore.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== ApprovalStatus.PENDING) {
      throw new Error('Workflow is not pending');
    }

    if (!workflow.approvers.includes(approverId)) {
      throw new Error('User is not an approver');
    }

    // Add approval comment
    const approvalComment: ApprovalComment = {
      id: this.generateCommentId(),
      author: approverId,
      comment,
      action: ApprovalAction.APPROVE,
      createdAt: new Date(),
    };

    // Update workflow
    const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
      status: ApprovalStatus.APPROVED,
      completedAt: new Date(),
      comments: [...workflow.comments, approvalComment],
    });

    // Update term
    await this.glossaryStore.updateTerm(workflow.termId, {
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date(),
    });

    return updatedWorkflow;
  }

  /**
   * Reject term
   */
  async reject(workflowId: string, approverId: string, reason: string): Promise<ApprovalWorkflow> {
    const workflow = await this.workflowStore.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== ApprovalStatus.PENDING) {
      throw new Error('Workflow is not pending');
    }

    if (!workflow.approvers.includes(approverId)) {
      throw new Error('User is not an approver');
    }

    // Add rejection comment
    const rejectionComment: ApprovalComment = {
      id: this.generateCommentId(),
      author: approverId,
      comment: reason,
      action: ApprovalAction.REJECT,
      createdAt: new Date(),
    };

    // Update workflow
    const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
      status: ApprovalStatus.REJECTED,
      completedAt: new Date(),
      comments: [...workflow.comments, rejectionComment],
    });

    // Update term
    await this.glossaryStore.updateTerm(workflow.termId, {
      approvalStatus: ApprovalStatus.REJECTED,
    });

    return updatedWorkflow;
  }

  /**
   * Request changes
   */
  async requestChanges(workflowId: string, approverId: string, changes: string): Promise<ApprovalWorkflow> {
    const workflow = await this.workflowStore.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== ApprovalStatus.PENDING) {
      throw new Error('Workflow is not pending');
    }

    if (!workflow.approvers.includes(approverId)) {
      throw new Error('User is not an approver');
    }

    // Add changes request comment
    const changesComment: ApprovalComment = {
      id: this.generateCommentId(),
      author: approverId,
      comment: changes,
      action: ApprovalAction.REQUEST_CHANGES,
      createdAt: new Date(),
    };

    // Update workflow
    const updatedWorkflow = await this.workflowStore.updateWorkflow(workflowId, {
      status: ApprovalStatus.CHANGES_REQUESTED,
      comments: [...workflow.comments, changesComment],
    });

    // Update term
    await this.glossaryStore.updateTerm(workflow.termId, {
      approvalStatus: ApprovalStatus.CHANGES_REQUESTED,
    });

    return updatedWorkflow;
  }

  /**
   * Add comment to workflow
   */
  async addComment(workflowId: string, userId: string, comment: string): Promise<ApprovalWorkflow> {
    const workflow = await this.workflowStore.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const newComment: ApprovalComment = {
      id: this.generateCommentId(),
      author: userId,
      comment,
      action: ApprovalAction.COMMENT,
      createdAt: new Date(),
    };

    return this.workflowStore.updateWorkflow(workflowId, {
      comments: [...workflow.comments, newComment],
    });
  }

  /**
   * Get workflows for term
   */
  async getWorkflowsForTerm(termId: string): Promise<ApprovalWorkflow[]> {
    return this.workflowStore.getWorkflowsForTerm(termId);
  }

  /**
   * Generate workflow ID
   */
  private generateWorkflowId(termId: string): string {
    return `workflow-${termId}-${Date.now()}`;
  }

  /**
   * Generate comment ID
   */
  private generateCommentId(): string {
    return `comment-${Date.now()}`;
  }
}
