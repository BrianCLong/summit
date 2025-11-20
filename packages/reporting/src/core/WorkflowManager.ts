/**
 * Intelligence product workflow management
 */

import { v4 as uuidv4 } from 'uuid';
import type { Report, ReportStatus } from './types.js';

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  assignee?: string;
  completedBy?: string;
  completedAt?: Date;
  comments?: string[];
  requiredApprovals?: number;
  approvals?: Array<{
    userId: string;
    approved: boolean;
    timestamp: Date;
    comment?: string;
  }>;
}

export interface Workflow {
  id: string;
  reportId: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  section?: string;
  lineNumber?: number;
}

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private comments: Map<string, Comment[]> = new Map();

  /**
   * Create a new workflow for a report
   */
  createWorkflow(
    reportId: string,
    steps: Omit<WorkflowStep, 'id' | 'status' | 'completedBy' | 'completedAt'>[]
  ): Workflow {
    const workflow: Workflow = {
      id: uuidv4(),
      reportId,
      steps: steps.map(step => ({
        ...step,
        id: uuidv4(),
        status: 'PENDING'
      })),
      currentStep: 0,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (workflow.steps.length > 0) {
      workflow.steps[0].status = 'IN_PROGRESS';
    }

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get workflow for a report
   */
  getWorkflowForReport(reportId: string): Workflow | undefined {
    return Array.from(this.workflows.values()).find(w => w.reportId === reportId);
  }

  /**
   * Complete current step and move to next
   */
  completeStep(
    workflowId: string,
    userId: string,
    comment?: string
  ): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) {
      throw new Error('No current step found');
    }

    currentStep.status = 'COMPLETED';
    currentStep.completedBy = userId;
    currentStep.completedAt = new Date();

    if (comment) {
      currentStep.comments = [...(currentStep.comments || []), comment];
    }

    // Move to next step
    workflow.currentStep++;
    if (workflow.currentStep < workflow.steps.length) {
      workflow.steps[workflow.currentStep].status = 'IN_PROGRESS';
    } else {
      workflow.status = 'COMPLETED';
    }

    workflow.updatedAt = new Date();
    return workflow;
  }

  /**
   * Reject current step
   */
  rejectStep(
    workflowId: string,
    userId: string,
    reason: string
  ): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) {
      throw new Error('No current step found');
    }

    currentStep.status = 'REJECTED';
    currentStep.completedBy = userId;
    currentStep.completedAt = new Date();
    currentStep.comments = [...(currentStep.comments || []), reason];

    workflow.status = 'CANCELLED';
    workflow.updatedAt = new Date();

    return workflow;
  }

  /**
   * Add approval to a step
   */
  addApproval(
    workflowId: string,
    stepId: string,
    userId: string,
    approved: boolean,
    comment?: string
  ): Workflow {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    step.approvals = [
      ...(step.approvals || []),
      {
        userId,
        approved,
        timestamp: new Date(),
        comment
      }
    ];

    workflow.updatedAt = new Date();
    return workflow;
  }

  /**
   * Add comment to a report
   */
  addComment(
    reportId: string,
    userId: string,
    content: string,
    section?: string,
    lineNumber?: number
  ): Comment {
    const comment: Comment = {
      id: uuidv4(),
      reportId,
      userId,
      content,
      timestamp: new Date(),
      resolved: false,
      section,
      lineNumber
    };

    const comments = this.comments.get(reportId) || [];
    comments.push(comment);
    this.comments.set(reportId, comments);

    return comment;
  }

  /**
   * Get comments for a report
   */
  getComments(reportId: string): Comment[] {
    return this.comments.get(reportId) || [];
  }

  /**
   * Resolve a comment
   */
  resolveComment(commentId: string, reportId: string): Comment {
    const comments = this.comments.get(reportId) || [];
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.resolved = true;
    return comment;
  }

  /**
   * Get pending workflows for a user
   */
  getPendingWorkflows(userId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter(workflow => {
      if (workflow.status !== 'ACTIVE') return false;

      const currentStep = workflow.steps[workflow.currentStep];
      return currentStep && currentStep.assignee === userId;
    });
  }
}
