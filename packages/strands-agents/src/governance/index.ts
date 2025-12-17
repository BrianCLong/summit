/**
 * @fileoverview Agent governance integration for IntelGraph agent-gateway
 * Provides policy enforcement, risk classification, and approval workflows
 * @module @intelgraph/strands-agents/governance
 */

import { RiskTierSchema, type RiskTier } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface ToolRiskProfile {
  /** Tool name */
  name: string;
  /** Risk tier */
  tier: RiskTier;
  /** Operations this tool performs */
  operations: string[];
  /** Requires human approval */
  requiresApproval: boolean;
  /** Can be executed autonomously */
  autonomous: boolean;
  /** Audit requirements */
  auditLevel: 'none' | 'basic' | 'detailed' | 'full';
}

export interface PolicyCheck {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for the decision */
  reason: string;
  /** Required approvals if any */
  requiredApprovals?: string[];
  /** Policy that was evaluated */
  policyId?: string;
}

export interface GovernanceConfig {
  /** Agent gateway URL */
  gatewayUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default risk tolerance */
  defaultRiskTolerance?: RiskTier;
  /** Tenant ID for scoping */
  tenantId?: string;
  /** Enable dry-run mode */
  dryRun?: boolean;
}

// ============================================================================
// Tool Risk Classifications
// ============================================================================

/**
 * Default risk classifications for IntelGraph tools
 * Aligned with agent-gateway risk tiers
 */
export const DEFAULT_TOOL_RISKS: Record<string, ToolRiskProfile> = {
  // Graph tools
  execute_cypher: {
    name: 'execute_cypher',
    tier: 'SUPERVISED',
    operations: ['graph:read', 'graph:query'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  find_path: {
    name: 'find_path',
    tier: 'AUTONOMOUS',
    operations: ['graph:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  get_neighbors: {
    name: 'get_neighbors',
    tier: 'AUTONOMOUS',
    operations: ['graph:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  get_subgraph: {
    name: 'get_subgraph',
    tier: 'AUTONOMOUS',
    operations: ['graph:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  get_graph_stats: {
    name: 'get_graph_stats',
    tier: 'AUTONOMOUS',
    operations: ['graph:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'none',
  },

  // Entity tools
  search_entities: {
    name: 'search_entities',
    tier: 'AUTONOMOUS',
    operations: ['entity:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  get_entity: {
    name: 'get_entity',
    tier: 'AUTONOMOUS',
    operations: ['entity:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  create_entity: {
    name: 'create_entity',
    tier: 'SUPERVISED',
    operations: ['entity:create'],
    requiresApproval: true,
    autonomous: false,
    auditLevel: 'detailed',
  },
  find_similar_entities: {
    name: 'find_similar_entities',
    tier: 'AUTONOMOUS',
    operations: ['entity:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  resolve_entity: {
    name: 'resolve_entity',
    tier: 'SUPERVISED',
    operations: ['entity:read', 'entity:create'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'detailed',
  },

  // Investigation tools
  get_investigation: {
    name: 'get_investigation',
    tier: 'AUTONOMOUS',
    operations: ['investigation:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  create_hypothesis: {
    name: 'create_hypothesis',
    tier: 'SUPERVISED',
    operations: ['investigation:write'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'detailed',
  },
  update_hypothesis: {
    name: 'update_hypothesis',
    tier: 'SUPERVISED',
    operations: ['investigation:write'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'detailed',
  },
  add_finding: {
    name: 'add_finding',
    tier: 'SUPERVISED',
    operations: ['investigation:write'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'detailed',
  },
  link_entities_to_investigation: {
    name: 'link_entities_to_investigation',
    tier: 'SUPERVISED',
    operations: ['investigation:write'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'detailed',
  },
  get_timeline: {
    name: 'get_timeline',
    tier: 'AUTONOMOUS',
    operations: ['investigation:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },

  // Analysis tools
  detect_patterns: {
    name: 'detect_patterns',
    tier: 'AUTONOMOUS',
    operations: ['analysis:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  analyze_centrality: {
    name: 'analyze_centrality',
    tier: 'AUTONOMOUS',
    operations: ['analysis:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  detect_anomalies: {
    name: 'detect_anomalies',
    tier: 'AUTONOMOUS',
    operations: ['analysis:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
  compare_entities: {
    name: 'compare_entities',
    tier: 'AUTONOMOUS',
    operations: ['entity:read'],
    requiresApproval: false,
    autonomous: true,
    auditLevel: 'basic',
  },
};

// ============================================================================
// Governance Middleware
// ============================================================================

/**
 * Creates governance middleware for Strands Agent tools
 *
 * This middleware integrates with the IntelGraph agent-gateway to:
 * - Classify tool operations by risk tier
 * - Enforce policy-based access control
 * - Route high-risk operations for approval
 * - Maintain audit trails
 *
 * @example
 * ```typescript
 * import { createGovernanceMiddleware } from '@intelgraph/strands-agents/governance';
 *
 * const governance = createGovernanceMiddleware({
 *   tenantId: 'tenant-123',
 *   defaultRiskTolerance: 'SUPERVISED',
 * });
 *
 * // Wrap tool execution with governance
 * const wrappedTool = governance.wrapTool(originalTool);
 *
 * // Check if an operation is allowed
 * const check = await governance.checkPolicy('create_entity', {
 *   userId: 'user-456',
 *   investigationId: 'inv-789',
 * });
 * ```
 */
export function createGovernanceMiddleware(config: GovernanceConfig = {}) {
  const {
    gatewayUrl,
    apiKey,
    defaultRiskTolerance = 'SUPERVISED',
    tenantId,
    dryRun = false,
  } = config;

  /**
   * Get risk profile for a tool
   */
  function getToolRisk(toolName: string): ToolRiskProfile {
    return DEFAULT_TOOL_RISKS[toolName] || {
      name: toolName,
      tier: 'RESTRICTED',
      operations: ['unknown'],
      requiresApproval: true,
      autonomous: false,
      auditLevel: 'full',
    };
  }

  /**
   * Check if a tool operation is allowed based on risk tier
   */
  function isAllowedByRiskTier(toolName: string, riskTolerance: RiskTier): boolean {
    const profile = getToolRisk(toolName);
    const tierOrder: RiskTier[] = ['AUTONOMOUS', 'SUPERVISED', 'RESTRICTED', 'PROHIBITED'];

    const toolTierIndex = tierOrder.indexOf(profile.tier);
    const toleranceIndex = tierOrder.indexOf(riskTolerance);

    return toolTierIndex <= toleranceIndex;
  }

  /**
   * Check policy for a tool operation
   */
  async function checkPolicy(
    toolName: string,
    context: Record<string, unknown> = {}
  ): Promise<PolicyCheck> {
    const profile = getToolRisk(toolName);

    // Check if tool is allowed by risk tier
    if (!isAllowedByRiskTier(toolName, defaultRiskTolerance)) {
      return {
        allowed: false,
        reason: `Tool ${toolName} (${profile.tier}) exceeds risk tolerance (${defaultRiskTolerance})`,
      };
    }

    // Check if approval is required
    if (profile.requiresApproval && !context.approved) {
      return {
        allowed: false,
        reason: `Tool ${toolName} requires approval`,
        requiredApprovals: ['supervisor'],
      };
    }

    // In a full implementation, this would call the agent-gateway
    // for OPA policy evaluation
    if (gatewayUrl && apiKey) {
      // const response = await fetch(`${gatewayUrl}/api/v1/policy/check`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     toolName,
      //     tenantId,
      //     context,
      //   }),
      // });
      // return response.json();
    }

    return {
      allowed: true,
      reason: 'Operation allowed by local policy',
    };
  }

  /**
   * Wrap a tool with governance checks
   */
  function wrapTool<T extends { name: string; callback: (...args: unknown[]) => Promise<string> }>(
    tool: T,
    options: { userId?: string; context?: Record<string, unknown> } = {}
  ): T {
    const wrappedCallback = async (...args: unknown[]): Promise<string> => {
      const profile = getToolRisk(tool.name);

      // Log tool invocation
      const auditEntry = {
        tool: tool.name,
        tier: profile.tier,
        operations: profile.operations,
        userId: options.userId,
        tenantId,
        timestamp: new Date().toISOString(),
        dryRun,
      };

      // Check policy
      const policyCheck = await checkPolicy(tool.name, {
        ...options.context,
        userId: options.userId,
      });

      if (!policyCheck.allowed) {
        console.warn(`[GOVERNANCE] Tool ${tool.name} blocked: ${policyCheck.reason}`);
        return JSON.stringify({
          success: false,
          error: `Governance: ${policyCheck.reason}`,
          requiresApproval: policyCheck.requiredApprovals,
        });
      }

      // Execute if dry run is disabled
      if (dryRun) {
        console.log(`[GOVERNANCE] Dry run - would execute: ${tool.name}`, auditEntry);
        return JSON.stringify({
          success: true,
          dryRun: true,
          message: `Dry run: ${tool.name} would be executed`,
        });
      }

      // Execute the tool
      const startTime = Date.now();
      try {
        const result = await tool.callback(...args);
        const executionTimeMs = Date.now() - startTime;

        // Log successful execution
        console.log(`[AUDIT] Tool executed`, {
          ...auditEntry,
          success: true,
          executionTimeMs,
        });

        return result;
      } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed execution
        console.error(`[AUDIT] Tool failed`, {
          ...auditEntry,
          success: false,
          error: errorMessage,
          executionTimeMs,
        });

        throw error;
      }
    };

    return {
      ...tool,
      callback: wrappedCallback,
    } as T;
  }

  /**
   * Wrap multiple tools with governance
   */
  function wrapTools<T extends { name: string; callback: (...args: unknown[]) => Promise<string> }>(
    tools: T[],
    options: { userId?: string; context?: Record<string, unknown> } = {}
  ): T[] {
    return tools.map((tool) => wrapTool(tool, options));
  }

  /**
   * Get all tools filtered by risk tier
   */
  function filterToolsByRisk<T extends { name: string }>(
    tools: T[],
    maxTier: RiskTier
  ): T[] {
    return tools.filter((tool) => isAllowedByRiskTier(tool.name, maxTier));
  }

  return {
    getToolRisk,
    isAllowedByRiskTier,
    checkPolicy,
    wrapTool,
    wrapTools,
    filterToolsByRisk,
    config: {
      tenantId,
      defaultRiskTolerance,
      dryRun,
    },
  };
}

export type GovernanceMiddleware = ReturnType<typeof createGovernanceMiddleware>;
