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
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();
  private policyByName: Map<string, ToolPermissionDefinition> = new Map();
  private invalidPolicies: Map<string, string> = new Map();

  constructor(policies: ToolPermissionDefinition[]) {
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);

    for (const policy of policies) {
      if (!this.validateSchema(policy.schema)) {
        this.invalidPolicies.set(policy.name, this.ajv.errorsText(this.ajv.errors));
        continue;
      }
      if (!isClosedObjectSchema(policy.schema)) {
        this.invalidPolicies.set(policy.name, 'Policy schema must be a closed object schema');
        continue;
      }
      this.policyByName.set(policy.name, policy);
      this.validators.set(policy.name, this.ajv.compile(policy.schema));
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

      const invalidPolicy = this.invalidPolicies.get(tool.name);
      if (invalidPolicy) {
        violations.push({ tool: tool.name, reason: `Policy schema invalid: ${invalidPolicy}` });
        continue;
      }

      if (!this.validateSchema(tool.inputSchema) || !isClosedObjectSchema(tool.inputSchema)) {
        violations.push({ tool: tool.name, reason: 'Tool input schema is invalid or not closed' });
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

  validateToolArguments(toolName: string, args: Record<string, unknown>): { valid: boolean; errors?: string } {
    const policy = this.policyByName.get(toolName);
    if (!policy) {
      return { valid: false, errors: 'Tool not allowlisted' };
    }
    const invalidPolicy = this.invalidPolicies.get(toolName);
    if (invalidPolicy) {
      return { valid: false, errors: `Policy schema invalid: ${invalidPolicy}` };
    }
    const validator = this.validators.get(toolName);
    if (!validator) {
      return { valid: false, errors: 'Tool schema validator missing' };
    }
    const valid = validator(args);
    return { valid: !!valid, errors: validator.errors ? this.ajv.errorsText(validator.errors) : undefined };
  }

  private validateSchema(schema: Record<string, unknown>): boolean {
    const result = this.ajv.validateSchema(schema);
    if (typeof (result as Promise<unknown>)?.then === 'function') {
      return false;
    }
    return result === true;
  }
}

function isClosedObjectSchema(schema: Record<string, unknown>): boolean {
  return schema.type === 'object' && schema.additionalProperties === false;
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
