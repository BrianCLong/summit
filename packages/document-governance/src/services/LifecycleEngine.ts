/**
 * Document Lifecycle Engine Service
 *
 * Manages document lifecycle state transitions, approvals, and history.
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  LifecycleDefinition,
  LifecycleTransition,
  TransitionRequest,
  TransitionResult,
  ApprovalRequest,
  ApprovalDecision,
  LifecycleHistoryEntry,
  AvailableTransitions,
} from '../types/lifecycle.js';
import { LifecycleType } from '../types/document.js';

// Lifecycle definitions loaded from YAML
const LIFECYCLE_DEFINITIONS: Record<LifecycleType, LifecycleDefinition> = {
  Contract: {
    type: 'Contract',
    description: 'Lifecycle for contractual documents',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Negotiation', description: 'Under negotiation', is_initial: false, is_terminal: false },
      { id: 'PendingApproval', description: 'Awaiting approval', is_initial: false, is_terminal: false },
      { id: 'Approved', description: 'Approved', is_initial: false, is_terminal: false },
      { id: 'Executed', description: 'Signed', is_initial: false, is_terminal: false },
      { id: 'Active', description: 'In effect', is_initial: false, is_terminal: false },
      { id: 'Expired', description: 'Term ended', is_initial: false, is_terminal: false },
      { id: 'Terminated', description: 'Terminated early', is_initial: false, is_terminal: true },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Negotiation', requires_approval: false },
      { from: 'Draft', to: 'PendingApproval', requires_approval: false },
      { from: 'Negotiation', to: 'Draft', requires_approval: false },
      { from: 'Negotiation', to: 'PendingApproval', requires_approval: false },
      { from: 'PendingApproval', to: 'Negotiation', requires_approval: false },
      { from: 'PendingApproval', to: 'Approved', requires_approval: true, approvers: ['Legal', 'AuthorizedSignatory'] },
      { from: 'Approved', to: 'Executed', requires_approval: false },
      { from: 'Executed', to: 'Active', requires_approval: false },
      { from: 'Active', to: 'Expired', requires_approval: false },
      { from: 'Active', to: 'Terminated', requires_approval: true, approvers: ['Legal'] },
      { from: 'Active', to: 'Superseded', requires_approval: false },
      { from: 'Expired', to: 'Archived', requires_approval: false },
      { from: 'Terminated', to: 'Archived', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
  Policy: {
    type: 'Policy',
    description: 'Lifecycle for policy documents',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Review', description: 'Under review', is_initial: false, is_terminal: false },
      { id: 'PendingApproval', description: 'Awaiting approval', is_initial: false, is_terminal: false },
      { id: 'Approved', description: 'Approved', is_initial: false, is_terminal: false },
      { id: 'Published', description: 'Active', is_initial: false, is_terminal: false },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Review', requires_approval: false },
      { from: 'Review', to: 'Draft', requires_approval: false },
      { from: 'Review', to: 'PendingApproval', requires_approval: false },
      { from: 'PendingApproval', to: 'Review', requires_approval: false },
      { from: 'PendingApproval', to: 'Approved', requires_approval: true, approvers: ['PolicyOwner', 'ExecutiveSponsor'] },
      { from: 'Approved', to: 'Published', requires_approval: false },
      { from: 'Published', to: 'Review', requires_approval: false },
      { from: 'Published', to: 'Superseded', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
  Record: {
    type: 'Record',
    description: 'Lifecycle for operational records',
    states: [
      { id: 'Open', description: 'Being created', is_initial: true, is_terminal: false },
      { id: 'Active', description: 'Finalized', is_initial: false, is_terminal: false },
      { id: 'UnderReview', description: 'Under review', is_initial: false, is_terminal: false },
      { id: 'Closed', description: 'Complete', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: false },
      { id: 'Destroyed', description: 'Deleted', is_initial: false, is_terminal: true },
    ],
    default_state: 'Open',
    transitions: [
      { from: 'Open', to: 'Active', requires_approval: false },
      { from: 'Active', to: 'UnderReview', requires_approval: false },
      { from: 'UnderReview', to: 'Active', requires_approval: false },
      { from: 'Active', to: 'Closed', requires_approval: false },
      { from: 'UnderReview', to: 'Closed', requires_approval: false },
      { from: 'Closed', to: 'Archived', requires_approval: false },
      { from: 'Archived', to: 'Destroyed', requires_approval: true, approvers: ['RecordsManager', 'Legal'] },
    ],
  },
  Versioned: {
    type: 'Versioned',
    description: 'Lifecycle for versioned documents',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Review', description: 'Under review', is_initial: false, is_terminal: false },
      { id: 'PendingApproval', description: 'Awaiting approval', is_initial: false, is_terminal: false },
      { id: 'Approved', description: 'Approved', is_initial: false, is_terminal: false },
      { id: 'Released', description: 'Published', is_initial: false, is_terminal: false },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Review', requires_approval: false },
      { from: 'Review', to: 'Draft', requires_approval: false },
      { from: 'Review', to: 'PendingApproval', requires_approval: false },
      { from: 'PendingApproval', to: 'Review', requires_approval: false },
      { from: 'PendingApproval', to: 'Approved', requires_approval: true, approvers: ['DocumentOwner'] },
      { from: 'Approved', to: 'Released', requires_approval: false },
      { from: 'Released', to: 'Draft', requires_approval: false },
      { from: 'Released', to: 'Superseded', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
  GovernanceCore: {
    type: 'GovernanceCore',
    description: 'Lifecycle for foundational governance documents',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Filed', description: 'Filed with authorities', is_initial: false, is_terminal: false },
      { id: 'PendingAcceptance', description: 'Awaiting acceptance', is_initial: false, is_terminal: false },
      { id: 'Accepted', description: 'In effect', is_initial: false, is_terminal: false },
      { id: 'Amended', description: 'Amended', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Filed', requires_approval: true, approvers: ['Legal', 'Board'] },
      { from: 'Filed', to: 'PendingAcceptance', requires_approval: false },
      { from: 'PendingAcceptance', to: 'Filed', requires_approval: false },
      { from: 'PendingAcceptance', to: 'Accepted', requires_approval: false },
      { from: 'Accepted', to: 'Amended', requires_approval: true, approvers: ['Board'] },
      { from: 'Amended', to: 'Accepted', requires_approval: false },
      { from: 'Accepted', to: 'Archived', requires_approval: true, approvers: ['Legal', 'Board'] },
    ],
  },
  GovernanceRecord: {
    type: 'GovernanceRecord',
    description: 'Lifecycle for governance records',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Finalized', description: 'Approved', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Finalized', requires_approval: true, approvers: ['BoardChair', 'Secretary'] },
      { from: 'Finalized', to: 'Archived', requires_approval: false },
    ],
  },
  GovernanceVersioned: {
    type: 'GovernanceVersioned',
    description: 'Lifecycle for versionable governance documents',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Review', description: 'Under review', is_initial: false, is_terminal: false },
      { id: 'Approved', description: 'Board approved', is_initial: false, is_terminal: false },
      { id: 'Active', description: 'In effect', is_initial: false, is_terminal: false },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Review', requires_approval: false },
      { from: 'Review', to: 'Draft', requires_approval: false },
      { from: 'Review', to: 'Approved', requires_approval: true, approvers: ['Board'] },
      { from: 'Approved', to: 'Active', requires_approval: false },
      { from: 'Active', to: 'Review', requires_approval: false },
      { from: 'Active', to: 'Superseded', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
  ExternalPolicy: {
    type: 'ExternalPolicy',
    description: 'Lifecycle for public-facing policies',
    states: [
      { id: 'Draft', description: 'Initial creation', is_initial: true, is_terminal: false },
      { id: 'Review', description: 'Internal review', is_initial: false, is_terminal: false },
      { id: 'LegalReview', description: 'Legal review', is_initial: false, is_terminal: false },
      { id: 'Approved', description: 'Approved', is_initial: false, is_terminal: false },
      { id: 'Published', description: 'Live', is_initial: false, is_terminal: false },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Draft',
    transitions: [
      { from: 'Draft', to: 'Review', requires_approval: false },
      { from: 'Review', to: 'Draft', requires_approval: false },
      { from: 'Review', to: 'LegalReview', requires_approval: false },
      { from: 'LegalReview', to: 'Review', requires_approval: false },
      { from: 'LegalReview', to: 'Approved', requires_approval: true, approvers: ['GC'] },
      { from: 'Approved', to: 'Published', requires_approval: true, approvers: ['ExecutiveSponsor'] },
      { from: 'Published', to: 'Review', requires_approval: false },
      { from: 'Published', to: 'Superseded', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
  GeneratedArtifact: {
    type: 'GeneratedArtifact',
    description: 'Lifecycle for auto-generated documents',
    states: [
      { id: 'Generated', description: 'Auto-generated', is_initial: true, is_terminal: false },
      { id: 'Validated', description: 'Validated', is_initial: false, is_terminal: false },
      { id: 'Published', description: 'Published', is_initial: false, is_terminal: false },
      { id: 'Superseded', description: 'Replaced', is_initial: false, is_terminal: false },
      { id: 'Archived', description: 'Archived', is_initial: false, is_terminal: true },
    ],
    default_state: 'Generated',
    transitions: [
      { from: 'Generated', to: 'Validated', requires_approval: false },
      { from: 'Validated', to: 'Published', requires_approval: false },
      { from: 'Published', to: 'Superseded', requires_approval: false },
      { from: 'Superseded', to: 'Archived', requires_approval: false },
    ],
  },
};

export class LifecycleEngine {
  constructor(private driver: Driver) {}

  /**
   * Get lifecycle definition for a lifecycle type
   */
  getLifecycleDefinition(lifecycleType: LifecycleType): LifecycleDefinition {
    const definition = LIFECYCLE_DEFINITIONS[lifecycleType];
    if (!definition) {
      throw new Error(`Unknown lifecycle type: ${lifecycleType}`);
    }
    return definition;
  }

  /**
   * Get available transitions for a document
   */
  async getAvailableTransitions(documentId: string): Promise<AvailableTransitions> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MATCH (dt:DocumentType {id: d.document_type_id})
        RETURN d.status as currentState, dt.lifecycle as lifecycleType
        `,
        { documentId }
      );

      if (result.records.length === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const record = result.records[0];
      const currentState = record.get('currentState');
      const lifecycleType = record.get('lifecycleType') as LifecycleType;

      const definition = this.getLifecycleDefinition(lifecycleType);
      const availableTransitions = definition.transitions
        .filter((t) => t.from === currentState)
        .map((t) => ({
          target_state: t.to,
          requires_approval: t.requires_approval,
          approvers: t.approvers,
          notes: t.notes,
        }));

      return {
        document_id: documentId,
        current_state: currentState,
        available_transitions: availableTransitions,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Request a state transition
   */
  async requestTransition(
    request: TransitionRequest,
    userId: string
  ): Promise<TransitionResult> {
    const session = this.driver.session();
    try {
      // Get current document state and lifecycle type
      const docResult = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MATCH (dt:DocumentType {id: d.document_type_id})
        RETURN d.status as currentState, dt.lifecycle as lifecycleType
        `,
        { documentId: request.document_id }
      );

      if (docResult.records.length === 0) {
        return {
          success: false,
          document_id: request.document_id,
          previous_state: '',
          new_state: request.target_state,
          errors: ['Document not found'],
          warnings: [],
          requires_approval: false,
        };
      }

      const record = docResult.records[0];
      const currentState = record.get('currentState');
      const lifecycleType = record.get('lifecycleType') as LifecycleType;

      // Find the transition
      const definition = this.getLifecycleDefinition(lifecycleType);
      const transition = definition.transitions.find(
        (t) => t.from === currentState && t.to === request.target_state
      );

      if (!transition) {
        return {
          success: false,
          document_id: request.document_id,
          previous_state: currentState,
          new_state: request.target_state,
          errors: [`Invalid transition from ${currentState} to ${request.target_state}`],
          warnings: [],
          requires_approval: false,
        };
      }

      // If approval required, create approval request
      if (transition.requires_approval) {
        const approvalRequestId = uuidv4();
        await session.run(
          `
          CREATE (ar:ApprovalRequest {
            id: $id,
            document_id: $documentId,
            transition_from: $from,
            transition_to: $to,
            requested_by: $requestedBy,
            requested_at: datetime(),
            approvers: $approvers,
            status: 'pending',
            comment: $comment
          })
          `,
          {
            id: approvalRequestId,
            documentId: request.document_id,
            from: currentState,
            to: request.target_state,
            requestedBy: userId,
            approvers: JSON.stringify(transition.approvers || []),
            comment: request.comment || null,
          }
        );

        return {
          success: true,
          document_id: request.document_id,
          previous_state: currentState,
          new_state: currentState, // State unchanged until approved
          errors: [],
          warnings: ['Transition requires approval'],
          requires_approval: true,
          approval_request_id: approvalRequestId,
        };
      }

      // Execute transition
      const transitionId = uuidv4();
      await session.run(
        `
        MATCH (d:Document {id: $documentId})
        SET d.status = $newState, d.updated_at = datetime(), d.updated_by = $userId
        CREATE (h:LifecycleHistory {
          id: $transitionId,
          document_id: $documentId,
          previous_state: $previousState,
          new_state: $newState,
          transition_type: 'manual',
          triggered_by: $userId,
          triggered_at: datetime(),
          comment: $comment
        })
        `,
        {
          documentId: request.document_id,
          newState: request.target_state,
          previousState: currentState,
          userId,
          transitionId,
          comment: request.comment || null,
        }
      );

      return {
        success: true,
        document_id: request.document_id,
        previous_state: currentState,
        new_state: request.target_state,
        transition_id: transitionId,
        errors: [],
        warnings: [],
        requires_approval: false,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Process an approval decision
   */
  async processApproval(
    approvalRequestId: string,
    decision: 'approved' | 'rejected',
    approverId: string,
    comment?: string
  ): Promise<TransitionResult> {
    const session = this.driver.session();
    try {
      // Get approval request
      const arResult = await session.run(
        `
        MATCH (ar:ApprovalRequest {id: $approvalRequestId})
        RETURN ar
        `,
        { approvalRequestId }
      );

      if (arResult.records.length === 0) {
        return {
          success: false,
          document_id: '',
          previous_state: '',
          new_state: '',
          errors: ['Approval request not found'],
          warnings: [],
          requires_approval: false,
        };
      }

      const ar = arResult.records[0].get('ar').properties;

      if (ar.status !== 'pending') {
        return {
          success: false,
          document_id: ar.document_id,
          previous_state: ar.transition_from,
          new_state: ar.transition_to,
          errors: ['Approval request is no longer pending'],
          warnings: [],
          requires_approval: false,
        };
      }

      // Record the decision
      const decisionId = uuidv4();
      await session.run(
        `
        CREATE (ad:ApprovalDecision {
          id: $decisionId,
          approval_request_id: $approvalRequestId,
          approver_id: $approverId,
          decision: $decision,
          comment: $comment,
          decided_at: datetime()
        })
        `,
        { decisionId, approvalRequestId, approverId, decision, comment: comment || null }
      );

      if (decision === 'rejected') {
        // Update approval request status
        await session.run(
          `
          MATCH (ar:ApprovalRequest {id: $approvalRequestId})
          SET ar.status = 'rejected'
          `,
          { approvalRequestId }
        );

        return {
          success: false,
          document_id: ar.document_id,
          previous_state: ar.transition_from,
          new_state: ar.transition_from,
          errors: ['Transition rejected'],
          warnings: [],
          requires_approval: false,
        };
      }

      // Execute the transition
      const transitionId = uuidv4();
      await session.run(
        `
        MATCH (ar:ApprovalRequest {id: $approvalRequestId})
        MATCH (d:Document {id: ar.document_id})
        SET d.status = ar.transition_to, d.updated_at = datetime(), d.updated_by = $approverId
        SET ar.status = 'approved'
        CREATE (h:LifecycleHistory {
          id: $transitionId,
          document_id: ar.document_id,
          previous_state: ar.transition_from,
          new_state: ar.transition_to,
          transition_type: 'approval',
          triggered_by: $approverId,
          triggered_at: datetime(),
          approval_request_id: $approvalRequestId,
          comment: $comment
        })
        `,
        { approvalRequestId, approverId, transitionId, comment: comment || null }
      );

      return {
        success: true,
        document_id: ar.document_id,
        previous_state: ar.transition_from,
        new_state: ar.transition_to,
        transition_id: transitionId,
        errors: [],
        warnings: [],
        requires_approval: false,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get lifecycle history for a document
   */
  async getLifecycleHistory(documentId: string): Promise<LifecycleHistoryEntry[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (h:LifecycleHistory {document_id: $documentId})
        RETURN h
        ORDER BY h.triggered_at DESC
        `,
        { documentId }
      );

      return result.records.map((record) => {
        const h = record.get('h').properties;
        return {
          id: h.id,
          document_id: h.document_id,
          previous_state: h.previous_state,
          new_state: h.new_state,
          transition_type: h.transition_type,
          triggered_by: h.triggered_by,
          triggered_at: h.triggered_at.toString(),
          approval_request_id: h.approval_request_id,
          comment: h.comment,
        };
      });
    } finally {
      await session.close();
    }
  }
}
