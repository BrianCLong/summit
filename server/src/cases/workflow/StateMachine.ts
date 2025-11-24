/**
 * Case Workflow State Machine
 * Handles stage transitions with guards (role, authority, data conditions)
 */

import { Pool } from 'pg';
import logger from '../../config/logger.js';
import {
  CaseStage,
  WorkflowTransition,
  WorkflowTransitionGuard,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
  CaseWithWorkflow,
} from './types.js';

const machineLogger = logger.child({ name: 'StateMachine' });

export interface TransitionContext {
  case: CaseWithWorkflow;
  userId: string;
  userRoles: string[]; // Role IDs the user has in this case
  reason: string;
  legalBasis?: string;
  metadata?: Record<string, any>;
}

export class WorkflowStateMachine {
  constructor(private pg: Pool) {}

  /**
   * Check if a stage transition is allowed
   */
  async isTransitionAllowed(
    caseType: string,
    fromStage: string | undefined,
    toStage: string,
  ): Promise<boolean> {
    // If no current stage (new case), allow transition to initial stage
    if (!fromStage) {
      const { rows } = await this.pg.query(
        `SELECT id FROM maestro.case_stages
         WHERE case_type = $1 AND name = $2 AND is_initial = true`,
        [caseType, toStage],
      );
      return rows.length > 0;
    }

    // Use the database function to check allowed transitions
    const { rows } = await this.pg.query(
      `SELECT maestro.is_stage_transition_allowed($1, $2, $3) as allowed`,
      [caseType, fromStage, toStage],
    );

    return rows[0]?.allowed || false;
  }

  /**
   * Get stage definition
   */
  async getStage(caseType: string, stageName: string): Promise<CaseStage | null> {
    const { rows } = await this.pg.query(
      `SELECT
        id, case_type, name, description, order_index, is_initial, is_terminal,
        required_role_id, sla_hours, allowed_transitions, metadata, created_at
       FROM maestro.case_stages
       WHERE case_type = $1 AND name = $2`,
      [caseType, stageName],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      caseType: row.case_type,
      name: row.name,
      description: row.description,
      orderIndex: row.order_index,
      isInitial: row.is_initial,
      isTerminal: row.is_terminal,
      requiredRoleId: row.required_role_id,
      slaHours: row.sla_hours,
      allowedTransitions: row.allowed_transitions || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  /**
   * Evaluate transition guards
   */
  async evaluateGuards(
    context: TransitionContext,
    guards: WorkflowTransitionGuard[],
  ): Promise<{ allowed: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const guard of guards) {
      const guardResult = await this.evaluateGuard(context, guard);
      if (!guardResult.allowed) {
        errors.push(...guardResult.errors);
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate a single guard
   */
  private async evaluateGuard(
    context: TransitionContext,
    guard: WorkflowTransitionGuard,
  ): Promise<{ allowed: boolean; errors: string[] }> {
    switch (guard.type) {
      case 'role':
        return this.evaluateRoleGuard(context, guard.config);
      case 'authority':
        return this.evaluateAuthorityGuard(context, guard.config);
      case 'data':
        return this.evaluateDataGuard(context, guard.config);
      case 'approval':
        return this.evaluateApprovalGuard(context, guard.config);
      default:
        return {
          allowed: false,
          errors: [`Unknown guard type: ${guard.type}`],
        };
    }
  }

  /**
   * Evaluate role guard - user must have specific role
   */
  private async evaluateRoleGuard(
    context: TransitionContext,
    config: Record<string, any>,
  ): Promise<{ allowed: boolean; errors: string[] }> {
    const requiredRoleIds = config.requiredRoleIds || [];

    if (requiredRoleIds.length === 0) {
      return { allowed: true, errors: [] };
    }

    const hasRequiredRole = requiredRoleIds.some((roleId: string) =>
      context.userRoles.includes(roleId),
    );

    if (!hasRequiredRole) {
      // Get role names for error message
      const { rows } = await this.pg.query(
        `SELECT name FROM maestro.case_roles WHERE id = ANY($1)`,
        [requiredRoleIds],
      );
      const roleNames = rows.map((r) => r.name).join(', ');

      return {
        allowed: false,
        errors: [`User does not have required role(s): ${roleNames}`],
      };
    }

    return { allowed: true, errors: [] };
  }

  /**
   * Evaluate authority guard - case must have proper legal authority
   */
  private async evaluateAuthorityGuard(
    context: TransitionContext,
    config: Record<string, any>,
  ): Promise<{ allowed: boolean; errors: string[] }> {
    const requiresWarrant = config.requiresWarrant || false;
    const requiresAuthority = config.requiresAuthority || false;

    const errors: string[] = [];

    if (requiresWarrant && !context.case.warrantId) {
      errors.push('Warrant ID is required for this transition');
    }

    if (requiresAuthority && !context.case.authorityReference) {
      errors.push('Authority reference is required for this transition');
    }

    return {
      allowed: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate data guard - case data must meet conditions
   */
  private async evaluateDataGuard(
    context: TransitionContext,
    config: Record<string, any>,
  ): Promise<{ allowed: boolean; errors: string[] }> {
    const conditions = config.conditions || [];
    const errors: string[] = [];

    for (const condition of conditions) {
      const { field, operator, value } = condition;

      // Get field value from case or metadata
      let fieldValue: any;
      if (field.startsWith('metadata.')) {
        const metadataKey = field.substring(9);
        fieldValue = context.case.metadata[metadataKey];
      } else {
        fieldValue = (context.case as any)[field];
      }

      // Evaluate condition
      const conditionMet = this.evaluateCondition(fieldValue, operator, value);

      if (!conditionMet) {
        errors.push(
          `Condition not met: ${field} ${operator} ${JSON.stringify(value)}`,
        );
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate approval guard - requires pending approval to be completed
   */
  private async evaluateApprovalGuard(
    context: TransitionContext,
    config: Record<string, any>,
  ): Promise<{ allowed: boolean; errors: string[] }> {
    const approvalType = config.approvalType;

    // Check if there's a completed approval of the required type
    const { rows } = await this.pg.query(
      `SELECT id, status FROM maestro.case_approvals
       WHERE case_id = $1
       AND approval_type = $2
       ORDER BY requested_at DESC
       LIMIT 1`,
      [context.case.id, approvalType],
    );

    if (rows.length === 0) {
      return {
        allowed: false,
        errors: [`Required approval of type '${approvalType}' not found`],
      };
    }

    if (rows[0].status !== 'approved') {
      return {
        allowed: false,
        errors: [
          `Required approval is ${rows[0].status}, must be approved`,
        ],
      };
    }

    return { allowed: true, errors: [] };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    fieldValue: any,
    operator: string,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case 'eq':
      case '==':
        return fieldValue === expectedValue;
      case 'ne':
      case '!=':
        return fieldValue !== expectedValue;
      case 'gt':
      case '>':
        return fieldValue > expectedValue;
      case 'gte':
      case '>=':
        return fieldValue >= expectedValue;
      case 'lt':
      case '<':
        return fieldValue < expectedValue;
      case 'lte':
      case '<=':
        return fieldValue <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'contains':
        return (
          Array.isArray(fieldValue) &&
          fieldValue.includes(expectedValue)
        );
      case 'exists':
        return expectedValue ? fieldValue !== null && fieldValue !== undefined : !fieldValue;
      default:
        machineLogger.warn({ operator }, 'Unknown condition operator');
        return false;
    }
  }

  /**
   * Execute a stage transition
   */
  async executeTransition(
    request: WorkflowTransitionRequest,
    currentCase: CaseWithWorkflow,
    userRoles: string[],
  ): Promise<WorkflowTransitionResult> {
    const { caseId, toStage, userId, reason, legalBasis, metadata } = request;

    const context: TransitionContext = {
      case: currentCase,
      userId,
      userRoles,
      reason,
      legalBasis,
      metadata,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check if transition is allowed in the workflow definition
    const isAllowed = await this.isTransitionAllowed(
      currentCase.caseType,
      currentCase.currentStage,
      toStage,
    );

    if (!isAllowed) {
      return {
        success: false,
        errors: [
          `Transition from '${currentCase.currentStage || 'initial'}' to '${toStage}' is not allowed`,
        ],
      };
    }

    // 2. Get target stage definition
    const targetStage = await this.getStage(currentCase.caseType, toStage);
    if (!targetStage) {
      return {
        success: false,
        errors: [`Target stage '${toStage}' not found`],
      };
    }

    // 3. Check if user has required role for target stage
    if (targetStage.requiredRoleId) {
      if (!userRoles.includes(targetStage.requiredRoleId)) {
        const { rows } = await this.pg.query(
          `SELECT name FROM maestro.case_roles WHERE id = $1`,
          [targetStage.requiredRoleId],
        );
        const roleName = rows[0]?.name || targetStage.requiredRoleId;

        return {
          success: false,
          errors: [`User does not have required role '${roleName}' for stage '${toStage}'`],
        };
      }
    }

    // 4. Evaluate custom guards (if any)
    // For now, this is a placeholder for future custom guard definitions
    // Guards can be stored in stage metadata or a separate guards table

    // 5. Execute the transition in database
    const client = await this.pg.connect();
    try {
      await client.query('BEGIN');

      // Set session variables for the trigger to use
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [
        userId,
      ]);
      await client.query(`SELECT set_config('app.transition_reason', $1, true)`, [
        reason,
      ]);

      // Update case stage
      const { rows } = await client.query(
        `UPDATE maestro.cases
         SET current_stage = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING current_stage, status`,
        [toStage, caseId],
      );

      if (rows.length === 0) {
        throw new Error('Case not found or update failed');
      }

      // If target stage is terminal, auto-close the case
      if (targetStage.isTerminal && currentCase.status !== 'closed') {
        await client.query(
          `UPDATE maestro.cases
           SET status = 'closed',
               closed_at = NOW(),
               closed_by = $1
           WHERE id = $2`,
          [userId, caseId],
        );
        warnings.push('Case automatically closed as stage is terminal');
      }

      // Create SLA for new stage if defined
      if (targetStage.slaHours) {
        const dueAt = new Date();
        dueAt.setHours(dueAt.getHours() + targetStage.slaHours);

        await client.query(
          `INSERT INTO maestro.case_slas (
            case_id, sla_type, target_hours, due_at, status, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            caseId,
            'stage_completion',
            targetStage.slaHours,
            dueAt,
            'active',
            JSON.stringify({ stage: toStage }),
          ],
        );
      }

      // Mark previous stage SLAs as completed
      if (currentCase.currentStage) {
        await client.query(
          `UPDATE maestro.case_slas
           SET status = 'met',
               completed_at = NOW()
           WHERE case_id = $1
           AND sla_type = 'stage_completion'
           AND status IN ('active', 'at_risk')
           AND metadata->>'stage' = $2`,
          [caseId, currentCase.currentStage],
        );
      }

      await client.query('COMMIT');

      machineLogger.info(
        {
          caseId,
          fromStage: currentCase.currentStage,
          toStage,
          userId,
        },
        'Stage transition executed',
      );

      return {
        success: true,
        errors: [],
        warnings: warnings.length > 0 ? warnings : undefined,
        newStage: toStage,
        newStatus: targetStage.isTerminal ? 'closed' : currentCase.status,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      machineLogger.error({ error, caseId, toStage }, 'Stage transition failed');
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get available transitions for a case
   */
  async getAvailableTransitions(
    currentCase: CaseWithWorkflow,
    userRoles: string[],
  ): Promise<string[]> {
    // If no current stage, get initial stages
    if (!currentCase.currentStage) {
      const { rows } = await this.pg.query(
        `SELECT name FROM maestro.case_stages
         WHERE case_type = $1 AND is_initial = true`,
        [currentCase.caseType],
      );
      return rows.map((r) => r.name);
    }

    // Get allowed transitions from current stage
    const currentStage = await this.getStage(
      currentCase.caseType,
      currentCase.currentStage,
    );

    if (!currentStage) {
      return [];
    }

    // Filter by role requirements
    const availableTransitions: string[] = [];
    for (const targetStageName of currentStage.allowedTransitions) {
      const targetStage = await this.getStage(currentCase.caseType, targetStageName);

      // If stage has role requirement, check if user has it
      if (targetStage?.requiredRoleId) {
        if (userRoles.includes(targetStage.requiredRoleId)) {
          availableTransitions.push(targetStageName);
        }
      } else {
        availableTransitions.push(targetStageName);
      }
    }

    return availableTransitions;
  }
}
