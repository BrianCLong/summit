
import { randomUUID } from 'crypto';
import {
  PolicySpec,
  EnforcementPlan,
  RuntimeContext,
  EnforcementResult,
  EnforcementDecision,
  DenialReason
} from './types.js';
import { PolicyCompiler } from './PolicyCompiler.js';

/**
 * Epic C3: Runtime Enforcement Service
 *
 * Evaluates requests against the compiled policy plan.
 */
export class EnforcementService {
  private static instance: EnforcementService;
  private currentPlan: EnforcementPlan | null = null;
  private compiler: PolicyCompiler;

  private constructor() {
    this.compiler = PolicyCompiler.getInstance();
  }

  public static getInstance(): EnforcementService {
    if (!EnforcementService.instance) {
      EnforcementService.instance = new EnforcementService();
    }
    return EnforcementService.instance;
  }

  /**
   * Load a policy spec and compile it into the active plan.
   */
  public loadPolicy(spec: PolicySpec): void {
    this.currentPlan = this.compiler.compile(spec);
  }

  /**
   * Evaluate a Query request
   */
  public evaluateQuery(context: RuntimeContext, plan: EnforcementPlan | null = this.currentPlan): EnforcementResult {
    return this.evaluateAction(context, 'query', plan);
  }

  /**
   * Evaluate an Export request
   */
  public evaluateExport(context: RuntimeContext, plan: EnforcementPlan | null = this.currentPlan): EnforcementResult {
    return this.evaluateAction(context, 'export', plan);
  }

  /**
   * Evaluate a Runbook Step execution
   */
  public evaluateRunbookStep(context: RuntimeContext, plan: EnforcementPlan | null = this.currentPlan): EnforcementResult {
    return this.evaluateAction(context, 'runbook', plan);
  }

  private evaluateAction(context: RuntimeContext, type: 'query' | 'export' | 'runbook', plan: EnforcementPlan | null): EnforcementResult {
    const decisionId = randomUUID();

    if (!plan) {
      // Fail safe: Strict mode requires a policy.
      return {
        allowed: false,
        reason: {
          code: 'NO_POLICY_LOADED',
          humanMessage: 'System is in strict mode but no policy is loaded.',
          remediationSteps: []
        },
        decisionId
      };
    }

    // 0. Check Purpose Constraints (Global)
    if (context.purpose) {
      const purposeDef = plan.purposeRegistry[context.purpose];
      if (purposeDef) {
        // If purpose is defined, action must be in allowedUses
        // We assume allowedUses contains specific actions or categories.
        // For strict matching:
        const isAllowed = purposeDef.allowedUses.includes(context.action.target) ||
          purposeDef.allowedUses.includes(type); // Allow by category (e.g. 'query')

        if (!isAllowed) {
          return {
            allowed: false,
            reason: {
              code: 'PURPOSE_MISMATCH',
              humanMessage: `Purpose '${context.purpose}' does not authorize action '${context.action.target}'.`,
              remediationSteps: [{
                action: "Change Purpose",
                details: `Select a purpose that allows '${context.action.target}' or request policy update.`
              }]
            },
            decisionId
          };
        }
      } else {
        // Purpose provided but not found in registry.
        // Should we allow or deny? Strict: Deny.
        return {
          allowed: false,
          reason: {
            code: 'INVALID_PURPOSE',
            humanMessage: `The purpose '${context.purpose}' is not recognized by the current policy.`,
            remediationSteps: []
          },
          decisionId
        };
      }
    }

    // 1. Retention Filters (Query only)
    let modifications;
    if (type === 'query') {
      // Check if target matches a retention rule
      // Assuming target might be a dataType or we have a mapping.
      // For MVP, if target matches a key in retentionRegistry, we enforce.
      const retentionRule = plan.retentionRegistry[context.action.target];
      if (retentionRule) {
        if (!modifications) modifications = { redactFields: [] as string[], filterClauses: [] as string[] };
        // Generate a filter clause
        // e.g. "created_at > NOW() - retentionDays"
        modifications.filterClauses.push(`age_in_days <= ${retentionRule.retentionDays}`);
      }
    }

    let ruleTable;
    switch (type) {
      case 'query': ruleTable = plan.queryRules; break;
      case 'export': ruleTable = plan.exportRules; break;
      case 'runbook': ruleTable = plan.runbookRules; break;
    }

    // 2. Evaluate Specific Rules
    const actionKey = context.action.target;
    const rule = ruleTable[actionKey];

    if (!rule) {
      // Default Behavior:
      // If we are strictly governing 'authorityRequiredFor', then absence means no authority needed.
      // However, C1.2 says "Missing tag defaults to most restrictive".
      // If the resource is sensitive (context should tell us, but context doesn't have sensitivity explicitly, only the Policy inputs defined it).
      // We assume if no rule exists, it's ALLOWED (Public/Internal default).
      // A "Restricted" resource should have a rule generated by the compiler.

      return { allowed: true, decisionId, modifications };
    }

    if (rule.decision === EnforcementDecision.DENY) {
      return {
        allowed: false,
        reason: rule.denialReason,
        decisionId
      };
    }

    if (rule.decision === EnforcementDecision.CONDITIONAL && rule.conditions) {
      for (const condition of rule.conditions) {
        const passed = this.evaluateCondition(condition, context);
        if (!passed) {
          return {
            allowed: false,
            reason: rule.denialReason,
            decisionId
          };
        }
      }
    }

    return { allowed: true, decisionId, modifications };
  }

  private evaluateCondition(condition: any, context: RuntimeContext): boolean {
    switch (condition.type) {
      case 'authority':
        if (condition.operator === 'contains') {
          return (context.activeAuthority || []).includes(condition.value);
        }
        break;
      // Future: Attribute-based checks
    }
    return false;
  }
}
