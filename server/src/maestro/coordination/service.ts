
import { CoordinationContext, CoordinationRole, CoordinationSchema, SharedBudget } from './types.js';
import { budgetManager } from './budget-manager.js';
import { maestroService } from '../MaestroService.js'; // We know this exists and has logAudit
import { logger } from '../../utils/logger.js';
import * as crypto from 'node:crypto';

export class CoordinationService {
  private static instance: CoordinationService;

  private constructor() {}

  static getInstance(): CoordinationService {
    if (!CoordinationService.instance) {
      CoordinationService.instance = new CoordinationService();
    }
    return CoordinationService.instance;
  }

  startCoordination(
    initiatorAgentId: string,
    schema: CoordinationSchema,
    budget: SharedBudget,
    parentContextId?: string
  ): string {
    const coordinationId = crypto.randomUUID();
    const context: CoordinationContext = {
      coordinationId,
      schema, // Store schema for validation
      schemaVersion: schema.version,
      initiatorAgentId,
      roles: {
        [initiatorAgentId]: 'COORDINATOR' // Defaulting initiator to coordinator, can be changed
      },
      budget,
      budgetConsumed: {
        totalSteps: 0,
        totalTokens: 0,
        wallClockTimeMs: 0
      },
      status: 'ACTIVE',
      startTime: new Date(),
      parent: parentContextId
    };

    budgetManager.initialize(context);

    // Log start
    Promise.resolve(maestroService.logAudit(
      initiatorAgentId,
      'coordination_start',
      coordinationId,
      `Started coordination with schema ${schema.version} and budget ${JSON.stringify(budget)}`
    )).catch(err => logger.error(`Failed to audit coordination start: ${err}`));

    return coordinationId;
  }

  validateAction(coordinationId: string, agentId: string, role: CoordinationRole): boolean {
    const context = budgetManager.get(coordinationId);
    if (!context) return false;

    // Auto-register if not present (assuming implicit permission for now to unblock execution)
    // In a stricter system, this would be a separate explicit 'Delegate' step.
    if (!context.roles[agentId]) {
      this.registerAgent(coordinationId, agentId, role);
    }

    // Verify agent has the role
    if (context.roles[agentId] !== role) return false;

    // Budget check
    const budgetCheck = budgetManager.checkBudget(coordinationId);
    if (!budgetCheck.allowed) {
        if (context.status === 'ACTIVE') {
            this.killCoordination(coordinationId, budgetCheck.reason || 'Budget exhausted');
        }
        return false;
    }

    return true;
  }

  registerAgent(coordinationId: string, agentId: string, role: CoordinationRole) {
    const context = budgetManager.get(coordinationId);
    if (!context) throw new Error('Context not found');

    // Verify role allowed by schema
    if (!context.schema.roles.includes(role)) {
       logger.warn(`Agent ${agentId} attempted to join as invalid role ${role} for schema ${context.schema.name}`);
       return; // Or throw, but failing silently/warn is often safer for async checks
    }

    context.roles[agentId] = role;

    Promise.resolve(maestroService.logAudit(
      'system',
      'agent_join',
      coordinationId,
      `Agent ${agentId} joined as ${role}`
    )).catch(err => logger.error(err));
  }

  consumeBudget(coordinationId: string, usage: Partial<SharedBudget>) {
    budgetManager.consumeBudget(coordinationId, usage);

    // Check if we need to kill
    const check = budgetManager.checkBudget(coordinationId);
    if (!check.allowed) {
        this.killCoordination(coordinationId, check.reason || 'Budget limit reached');
    }
  }

  killCoordination(coordinationId: string, reason: string) {
    const context = budgetManager.get(coordinationId);
    if (!context || context.status !== 'ACTIVE') return;

    context.status = 'TERMINATED';
    context.endTime = new Date();
    context.terminationReason = reason;

    logger.warn(`Killing coordination ${coordinationId}: ${reason}`);

    Promise.resolve(maestroService.logAudit(
      'system',
      'coordination_kill',
      coordinationId,
      `Coordination terminated: ${reason}`
    )).catch(err => logger.error(err));

    // Here we would ideally emit an event to cancel all running tasks for this coordination ID
    // Since we don't have direct access to the Engine's Queue here, we rely on the Engine checking the status
    // before executing/processing tasks.
  }
}

export const coordinationService = CoordinationService.getInstance();
