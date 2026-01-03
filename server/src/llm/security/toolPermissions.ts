import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { ToolDefinition } from '../types.js';
import type { ToolPermissionDefinition } from '../types.js';
import type { SecurityContext } from '../types.js';

export interface ToolEvaluationContext {
  route?: string;
  roles?: string[];
  strictMode?: boolean;
  stepUpVerified?: boolean;
}

export interface ToolPermissionResult {
  allowedTools: ToolDefinition[];
  disabledTools: string[];
  violations: { tool: string; reason: string }[];
  requiresStepUp: boolean;
}

export class ToolPermissionEvaluator {
  private validators: Map<string, ValidateFunction> = new Map();
  private policyByName: Map<string, ToolPermissionDefinition> = new Map();

  constructor(policies: ToolPermissionDefinition[]) {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);

    for (const policy of policies) {
      this.policyByName.set(policy.name, policy);
      this.validators.set(policy.name, ajv.compile(policy.schema));
    }
  }

  evaluate(tools: ToolDefinition[] | undefined, context: ToolEvaluationContext): ToolPermissionResult {
    if (!tools || tools.length === 0) {
      return { allowedTools: [], disabledTools: [], violations: [], requiresStepUp: false };
    }

    const allowedTools: ToolDefinition[] = [];
    const disabledTools: string[] = [];
    const violations: { tool: string; reason: string }[] = [];
    let requiresStepUp = false;

    for (const tool of tools) {
      const policy = this.policyByName.get(tool.name);
      if (!policy) {
        violations.push({ tool: tool.name, reason: 'Tool not allowlisted' });
        continue;
      }

      const validator = this.validators.get(tool.name);
      if (validator && !validator(tool.inputSchema || {})) {
        violations.push({ tool: tool.name, reason: 'Input schema failed validation' });
        continue;
      }

      const roleAllowed = !policy.allowedRoles.length || (context.roles || []).some((role) => policy.allowedRoles.includes(role));
      const routeAllowed = !policy.allowedRoutes.length || (context.route && policy.allowedRoutes.includes(context.route));

      if (!roleAllowed || !routeAllowed) {
        violations.push({ tool: tool.name, reason: 'Role or route not allowed' });
        continue;
      }

      const isHighRisk = policy.highRisk || policy.minPrivilege === 'high' || policy.minPrivilege === 'critical';
      const requiresStrictDisable = context.strictMode && isHighRisk;

      if (requiresStrictDisable) {
        disabledTools.push(tool.name);
        continue;
      }

      if (policy.stepUpRequired && !context.stepUpVerified) {
        requiresStepUp = true;
        violations.push({ tool: tool.name, reason: 'Step-up authentication required' });
        continue;
      }

      allowedTools.push(tool);
    }

    return { allowedTools, disabledTools, violations, requiresStepUp };
  }
}

export function mergeToolSecurityContext(
  existing: SecurityContext | undefined,
  result: ToolPermissionResult,
  stepUpRequired: boolean,
): SecurityContext {
  return {
    promptFindings: existing?.promptFindings || [],
    strictMode: existing?.strictMode ?? stepUpRequired,
    disabledTools: [...(existing?.disabledTools || []), ...result.disabledTools],
    stepUpRequired: existing?.stepUpRequired || stepUpRequired,
    stepUpVerified: existing?.stepUpVerified,
  };
}
