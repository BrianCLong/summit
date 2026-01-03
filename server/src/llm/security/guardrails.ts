import { PromptFirewall, PromptFirewallOptions } from './promptFirewall.js';
import { mergeToolSecurityContext, ToolPermissionEvaluator } from './toolPermissions.js';
import { sanitizeModelOutput } from './outputSanitizer.js';
import { promptFirewallBlocked, promptFirewallStepUp, promptFirewallStrict } from './metrics.js';
import type { SafetyGuardrail, LLMRequest, LLMResponse, ToolDefinition, ToolPermissionDefinition, SecurityContext } from '../types.js';

export interface PromptGuardrailConfig {
  firewall?: Partial<PromptFirewallOptions>;
  toolPermissions?: ToolPermissionDefinition[];
}

export class PromptInjectionGuardrail implements SafetyGuardrail {
  name = 'prompt-injection-firewall';
  private firewall: PromptFirewall;
  private toolEvaluator?: ToolPermissionEvaluator;

  constructor(config: PromptGuardrailConfig) {
    this.firewall = new PromptFirewall(config.firewall);
    if (config.toolPermissions) {
      this.toolEvaluator = new ToolPermissionEvaluator(config.toolPermissions);
    }
  }

  async validateRequest(request: LLMRequest): Promise<LLMRequest> {
    const findings = this.firewall.evaluateMessages(request.messages || []);
    const action = this.firewall.overallAction(findings);

    if (request.retrievalContext?.chunks?.length) {
      const guardedChunks = this.firewall.evaluateRetrievalChunks(request.retrievalContext.chunks);
      request = { ...request, retrievalContext: { chunks: guardedChunks } };
      findings.push(...guardedChunks.map((chunk) => chunk.finding!).filter(Boolean));
    }

    if (action === 'block') {
      promptFirewallBlocked.inc();
        this.firewall.logDecision({
          tenantId: request.tenantId,
          userId: request.userId,
          route: request.route,
          findings,
          tools: this.extractToolNames(request.tools),
          action,
        });
        throw new Error('Request blocked by prompt firewall due to unsafe content');
      }

    const strictMode = action === 'allow_with_strict_mode' || action === 'require_step_up';
    const stepUpRequired = action === 'require_step_up';
    if (strictMode) {
      promptFirewallStrict.inc();
    }
    if (stepUpRequired) {
      promptFirewallStepUp.inc();
    }

    let securityContext: SecurityContext = {
      promptFindings: findings,
      strictMode,
      disabledTools: [],
      stepUpRequired,
      stepUpVerified: request.securityContext?.stepUpVerified,
    };

    if (this.toolEvaluator) {
      const evaluation = this.toolEvaluator.evaluate(
        (request.tools as ToolDefinition[]) || [],
        {
          roles: request.userRoles,
          route: request.route,
          strictMode: securityContext.strictMode,
          stepUpVerified: request.securityContext?.stepUpVerified,
        },
      );

      securityContext = mergeToolSecurityContext(securityContext, evaluation, stepUpRequired || evaluation.requiresStepUp);

      if (evaluation.requiresStepUp && !request.securityContext?.stepUpVerified) {
        promptFirewallStepUp.inc();
        throw new Error('Step-up authentication required before invoking sensitive tools');
      }

      if (evaluation.violations.length > 0) {
        const allowed = evaluation.allowedTools;
        this.firewall.logDecision({
          tenantId: request.tenantId,
          userId: request.userId,
          route: request.route,
          findings,
          tools: this.extractToolNames(request.tools),
          allowedTools: allowed.map((tool) => tool.name),
          action: 'allow_with_strict_mode',
        });
        return {
          ...request,
          tools: allowed,
          securityContext,
          tags: [...(request.tags || []), 'tools-sanitized'],
        };
      }

      return { ...request, tools: evaluation.allowedTools, securityContext };
    }

    this.firewall.logDecision({
      tenantId: request.tenantId,
      userId: request.userId,
      route: request.route,
      findings,
      tools: this.extractToolNames(request.tools),
      allowedTools: Array.isArray(request.tools)
        ? (request.tools as ToolDefinition[]).map((tool) => tool.name)
        : undefined,
      action,
    });

    return { ...request, securityContext };
  }

  async validateResponse(response: LLMResponse): Promise<LLMResponse> {
    const sanitized = sanitizeModelOutput(response.text);
    return {
      ...response,
      text: sanitized,
    };
  }

  private extractToolNames(tools: unknown): string[] | undefined {
    if (!Array.isArray(tools)) return undefined;
    return (tools as ToolDefinition[]).map((tool) => tool.name);
  }
}
