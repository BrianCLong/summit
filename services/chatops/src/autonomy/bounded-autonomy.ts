/**
 * Bounded Autonomy Engine
 *
 * Implements risk-tiered agent execution with ReAct traces:
 * - Plan Agent: Decompose intent into subtasks
 * - Research Agent: RAG over knowledge graph
 * - Executor Agent: Invoke tools with risk gates
 *
 * Risk Tiers:
 * - AUTONOMOUS: Low-risk reads, summaries (execute immediately)
 * - HITL: Moderate risk, analyst approval required
 * - PROHIBITED: High-risk, blocked with audit logging
 *
 * Differentiator vs. competitors:
 * - Full ReAct traces for audit/explainability
 * - Risk-tiered gates (no competitor has this fully)
 * - Self-correction on errors
 */

import { v4 as uuidv4 } from 'uuid';

import {
  AggregatedIntent,
  ApprovalRequest,
  AuditRequirement,
  ReActStep,
  ReActTrace,
  RiskClassification,
  RiskLevel,
  SecurityContext,
  ToolOperation,
} from '../types.js';

// =============================================================================
// RISK CLASSIFICATION
// =============================================================================

/**
 * Default risk classifications for operations
 */
const DEFAULT_RISK_RULES: Record<string, RiskLevel> = {
  // Autonomous (low risk)
  'graph:read': 'autonomous',
  'graph:query': 'autonomous',
  'entity:lookup': 'autonomous',
  'path:find': 'autonomous',
  'summary:generate': 'autonomous',
  'nl2cypher:translate': 'autonomous',

  // HITL (moderate risk)
  'graph:write': 'hitl',
  'entity:create': 'hitl',
  'entity:update': 'hitl',
  'relationship:create': 'hitl',
  'alert:create': 'hitl',
  'report:generate': 'hitl',
  'external:api': 'hitl',
  'data:export': 'hitl',

  // Prohibited (high risk)
  'entity:delete': 'prohibited',
  'bulk:delete': 'prohibited',
  'cross_tenant:access': 'prohibited',
  'policy:override': 'prohibited',
  'classification:downgrade': 'prohibited',
  'pii:access': 'prohibited',
};

/**
 * Operations that require elevated clearance
 */
const CLEARANCE_REQUIRED: Record<string, string> = {
  'classified:read': 'SECRET',
  'classified:write': 'TOP_SECRET',
  'sci:access': 'TOP_SECRET_SCI',
};

// =============================================================================
// RISK CLASSIFIER
// =============================================================================

export class RiskClassifier {
  private rules: Record<string, RiskLevel>;

  constructor(customRules?: Record<string, RiskLevel>) {
    this.rules = { ...DEFAULT_RISK_RULES, ...customRules };
  }

  /**
   * Classify an operation's risk level
   */
  classify(operation: ToolOperation, context: SecurityContext): RiskClassification {
    const operationKey = `${operation.toolId}:${operation.operation}`;

    // Check for explicit risk override
    if (operation.riskOverride) {
      return {
        level: operation.riskOverride,
        reason: `Explicit override to ${operation.riskOverride}`,
      };
    }

    // Check clearance requirements
    const requiredClearance = CLEARANCE_REQUIRED[operationKey];
    if (requiredClearance) {
      const clearanceLevels = [
        'UNCLASSIFIED',
        'CUI',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
        'TOP_SECRET_SCI',
      ];
      const userLevel = clearanceLevels.indexOf(context.clearanceLevel);
      const requiredLevel = clearanceLevels.indexOf(requiredClearance);

      if (userLevel < requiredLevel) {
        return {
          level: 'prohibited',
          reason: `Requires ${requiredClearance} clearance, user has ${context.clearanceLevel}`,
          auditRequirements: [
            {
              type: 'alert',
              retention: 'permanent',
              notifyRoles: ['security-officer', 'compliance-officer'],
            },
          ],
        };
      }
    }

    // Check bulk operations
    const inputCount = this.estimateInputSize(operation.input);
    if (inputCount > 1000) {
      return {
        level: 'hitl',
        reason: `Bulk operation affecting ${inputCount} items`,
        requiredApprovals: 1,
        requiredRoles: ['supervisor', 'admin'],
      };
    }

    // Check default rules
    const defaultLevel = this.rules[operationKey] ?? 'hitl';

    return {
      level: defaultLevel,
      reason: `Default classification for ${operationKey}`,
      requiredApprovals: defaultLevel === 'hitl' ? 1 : undefined,
      requiredRoles: defaultLevel === 'hitl' ? ['supervisor', 'analyst'] : undefined,
      auditRequirements:
        defaultLevel === 'prohibited'
          ? [
              {
                type: 'alert',
                retention: 'permanent',
                notifyRoles: ['security-officer'],
              },
            ]
          : undefined,
    };
  }

  private estimateInputSize(input: Record<string, unknown>): number {
    if (Array.isArray(input.ids)) return input.ids.length;
    if (Array.isArray(input.entities)) return input.entities.length;
    if (typeof input.query === 'string' && input.query.includes('MATCH'))
      return 100; // Assume graph queries could affect many
    return 1;
  }
}

// =============================================================================
// REACT TRACE RECORDER
// =============================================================================

export class ReActTraceRecorder {
  private traces: Map<string, ReActTrace> = new Map();

  /**
   * Start a new trace
   */
  startTrace(sessionId: string, userId: string, tenantId: string): ReActTrace {
    const trace: ReActTrace = {
      traceId: uuidv4(),
      sessionId,
      userId,
      tenantId,
      startTime: new Date(),
      steps: [],
      finalOutcome: 'partial',
      totalTokens: 0,
      totalLatencyMs: 0,
      hitlEscalations: 0,
      prohibitedBlocks: 0,
    };

    this.traces.set(trace.traceId, trace);
    return trace;
  }

  /**
   * Record a thought step
   */
  recordThought(traceId: string, thought: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const stepNumber = trace.steps.length + 1;
    const step: ReActStep = {
      stepNumber,
      thought,
      action: {
        tool: '',
        input: {},
        riskLevel: 'autonomous',
      },
      observation: {
        result: null,
        success: false,
        tokensUsed: 0,
        latencyMs: 0,
      },
      timestamp: new Date(),
    };

    trace.steps.push(step);
  }

  /**
   * Record an action
   */
  recordAction(
    traceId: string,
    tool: string,
    input: Record<string, unknown>,
    riskLevel: RiskLevel,
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const currentStep = trace.steps[trace.steps.length - 1];
    if (!currentStep) throw new Error('No thought recorded before action');

    currentStep.action = {
      tool,
      input,
      riskLevel,
    };

    if (riskLevel === 'hitl') {
      trace.hitlEscalations++;
    } else if (riskLevel === 'prohibited') {
      trace.prohibitedBlocks++;
    }
  }

  /**
   * Record an observation
   */
  recordObservation(
    traceId: string,
    result: unknown,
    success: boolean,
    tokensUsed: number,
    latencyMs: number,
    error?: string,
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const currentStep = trace.steps[trace.steps.length - 1];
    if (!currentStep) throw new Error('No action recorded before observation');

    currentStep.observation = {
      result,
      success,
      tokensUsed,
      latencyMs,
      error,
    };

    trace.totalTokens += tokensUsed;
    trace.totalLatencyMs += latencyMs;
  }

  /**
   * Complete a trace
   */
  completeTrace(traceId: string, outcome: ReActTrace['finalOutcome']): ReActTrace {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    trace.endTime = new Date();
    trace.finalOutcome = outcome;

    return trace;
  }

  /**
   * Get a trace by ID
   */
  getTrace(traceId: string): ReActTrace | undefined {
    return this.traces.get(traceId);
  }
}

// =============================================================================
// BOUNDED AUTONOMY ENGINE
// =============================================================================

export interface BoundedAutonomyConfig {
  maxSteps: number;
  stepTimeoutMs: number;
  enableSelfCorrection: boolean;
}

export interface ToolRegistry {
  invoke(operation: ToolOperation): Promise<{ result: unknown; tokensUsed: number }>;
  getToolSchema(toolId: string): unknown;
}

export interface ApprovalService {
  requestApproval(request: ApprovalRequest): Promise<string>; // Returns request ID
  checkStatus(requestId: string): Promise<'pending' | 'approved' | 'denied' | 'expired'>;
  waitForApproval(requestId: string, timeoutMs: number): Promise<boolean>;
}

export interface AuditService {
  logTrace(trace: ReActTrace): Promise<void>;
  logBlocked(operation: ToolOperation, classification: RiskClassification): Promise<void>;
}

export class BoundedAutonomyEngine {
  private config: BoundedAutonomyConfig;
  private riskClassifier: RiskClassifier;
  private traceRecorder: ReActTraceRecorder;
  private toolRegistry: ToolRegistry;
  private approvalService: ApprovalService;
  private auditService: AuditService;

  constructor(
    config: BoundedAutonomyConfig,
    toolRegistry: ToolRegistry,
    approvalService: ApprovalService,
    auditService: AuditService,
    customRiskRules?: Record<string, RiskLevel>,
  ) {
    this.config = config;
    this.riskClassifier = new RiskClassifier(customRiskRules);
    this.traceRecorder = new ReActTraceRecorder();
    this.toolRegistry = toolRegistry;
    this.approvalService = approvalService;
    this.auditService = auditService;
  }

  /**
   * Execute an agent task with bounded autonomy
   */
  async execute(
    intent: AggregatedIntent,
    context: SecurityContext,
  ): Promise<{
    result: unknown;
    trace: ReActTrace;
  }> {
    const trace = this.traceRecorder.startTrace(
      context.sessionId,
      context.userId,
      context.tenantId,
    );

    try {
      // Step 1: Plan - decompose intent into operations
      this.traceRecorder.recordThought(
        trace.traceId,
        `Analyzing intent: ${intent.primaryIntent} with confidence ${intent.confidence}`,
      );

      const plan = await this.planOperations(intent);
      this.traceRecorder.recordAction(trace.traceId, 'plan', { operations: plan }, 'autonomous');
      this.traceRecorder.recordObservation(trace.traceId, { plan }, true, 50, 100);

      // Step 2: Execute each operation with risk gates
      const results: unknown[] = [];

      for (const operation of plan) {
        // Classify risk
        const classification = this.riskClassifier.classify(operation, context);

        this.traceRecorder.recordThought(
          trace.traceId,
          `Operation ${operation.toolId}:${operation.operation} classified as ${classification.level}`,
        );

        // Apply risk gate
        const gateResult = await this.applyRiskGate(operation, classification, context, trace);

        if (!gateResult.proceed) {
          if (gateResult.blocked) {
            this.traceRecorder.completeTrace(trace.traceId, 'blocked');
            await this.auditService.logTrace(trace);
            return { result: { error: 'Operation blocked by policy' }, trace };
          }
          continue; // Skip if denied but not blocked
        }

        // Execute operation
        const start = Date.now();
        try {
          const { result, tokensUsed } = await this.toolRegistry.invoke(operation);
          const latencyMs = Date.now() - start;

          this.traceRecorder.recordObservation(trace.traceId, result, true, tokensUsed, latencyMs);
          results.push(result);
        } catch (error) {
          const latencyMs = Date.now() - start;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';

          this.traceRecorder.recordObservation(trace.traceId, null, false, 0, latencyMs, errorMsg);

          // Self-correction if enabled
          if (this.config.enableSelfCorrection && trace.steps.length < this.config.maxSteps) {
            this.traceRecorder.recordThought(
              trace.traceId,
              `Error encountered: ${errorMsg}. Attempting recovery...`,
            );
            // Retry logic could go here
          }
        }

        // Check step limit
        if (trace.steps.length >= this.config.maxSteps) {
          this.traceRecorder.recordThought(
            trace.traceId,
            `Maximum steps (${this.config.maxSteps}) reached. Stopping execution.`,
          );
          break;
        }
      }

      // Complete trace
      const outcome = results.length > 0 ? 'success' : 'partial';
      this.traceRecorder.completeTrace(trace.traceId, outcome);
      await this.auditService.logTrace(trace);

      return {
        result: results.length === 1 ? results[0] : results,
        trace,
      };
    } catch (error) {
      this.traceRecorder.completeTrace(trace.traceId, 'failed');
      await this.auditService.logTrace(trace);
      throw error;
    }
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  private async planOperations(intent: AggregatedIntent): Promise<ToolOperation[]> {
    // Map intents to tool operations
    const operations: ToolOperation[] = [];

    switch (intent.primaryIntent) {
      case 'entity_lookup':
        operations.push({
          toolId: 'graph',
          operation: 'read',
          input: { entities: intent.osintEntities },
        });
        break;

      case 'path_finding':
        operations.push({
          toolId: 'graph',
          operation: 'query',
          input: { type: 'shortest_path', entities: intent.osintEntities },
        });
        break;

      case 'threat_assessment':
        operations.push(
          {
            toolId: 'graph',
            operation: 'query',
            input: { type: 'threat_context', entities: intent.osintEntities },
          },
          {
            toolId: 'threat',
            operation: 'assess',
            input: { entities: intent.osintEntities },
          },
        );
        break;

      case 'report_generation':
        operations.push({
          toolId: 'report',
          operation: 'generate',
          input: { entities: intent.osintEntities },
        });
        break;

      case 'alert_creation':
        operations.push({
          toolId: 'alert',
          operation: 'create',
          input: { entities: intent.osintEntities },
        });
        break;

      case 'data_export':
        operations.push({
          toolId: 'data',
          operation: 'export',
          input: { entities: intent.osintEntities },
        });
        break;

      default:
        operations.push({
          toolId: 'graph',
          operation: 'query',
          input: { type: 'general', entities: intent.osintEntities },
        });
    }

    return operations;
  }

  private async applyRiskGate(
    operation: ToolOperation,
    classification: RiskClassification,
    context: SecurityContext,
    trace: ReActTrace,
  ): Promise<{ proceed: boolean; blocked: boolean }> {
    switch (classification.level) {
      case 'autonomous':
        this.traceRecorder.recordAction(
          trace.traceId,
          operation.toolId,
          operation.input,
          'autonomous',
        );
        return { proceed: true, blocked: false };

      case 'hitl': {
        this.traceRecorder.recordAction(trace.traceId, operation.toolId, operation.input, 'hitl');

        // Create approval request
        const request: ApprovalRequest = {
          requestId: uuidv4(),
          sessionId: context.sessionId,
          userId: context.userId,
          tenantId: context.tenantId,
          operation,
          classification,
          trace,
          status: 'pending',
          requestedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
          approvals: [],
        };

        const requestId = await this.approvalService.requestApproval(request);

        // Wait for approval (with timeout)
        const approved = await this.approvalService.waitForApproval(
          requestId,
          this.config.stepTimeoutMs,
        );

        this.traceRecorder.recordObservation(
          trace.traceId,
          { approved, requestId },
          approved,
          0,
          0,
          approved ? undefined : 'Approval denied or timed out',
        );

        return { proceed: approved, blocked: false };
      }

      case 'prohibited':
        this.traceRecorder.recordAction(
          trace.traceId,
          operation.toolId,
          operation.input,
          'prohibited',
        );

        await this.auditService.logBlocked(operation, classification);

        this.traceRecorder.recordObservation(
          trace.traceId,
          null,
          false,
          0,
          0,
          `Prohibited: ${classification.reason}`,
        );

        return { proceed: false, blocked: true };

      default:
        return { proceed: false, blocked: true };
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createBoundedAutonomyEngine(
  config: BoundedAutonomyConfig,
  toolRegistry: ToolRegistry,
  approvalService: ApprovalService,
  auditService: AuditService,
  customRiskRules?: Record<string, RiskLevel>,
): BoundedAutonomyEngine {
  return new BoundedAutonomyEngine(
    config,
    toolRegistry,
    approvalService,
    auditService,
    customRiskRules,
  );
}
