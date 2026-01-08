import { randomUUID } from "node:crypto";
import type {
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyEffect,
  WorkflowDefinition,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "common-types";

export type GovernanceVerdictStatus = "APPROVED" | "REJECTED" | "REQUIRES_REVIEW";
export type GovernanceSurface = "microservice" | "workflow" | "ui";

export interface GovernanceVerdict {
  id: string;
  status: GovernanceVerdictStatus;
  action: string;
  resource: string;
  policyIds: string[];
  reasons: string[];
  matchedRules: string[];
  timestamp: string;
  evaluatedBy: string;
  surface: GovernanceSurface;
  recommendations?: string[];
  evidence?: Record<string, unknown>;
  runtime?: {
    latencyMs?: number;
    dynamicRulesApplied?: string[];
    sequence?: number;
  };
  actor?: {
    tenantId?: string;
    userId?: string;
    roles?: string[];
    region?: string;
  };
}

export interface GovernedEnvelope<T> {
  payload: T;
  governance: GovernanceVerdict;
}

export interface GovernanceOrchestratorOptions {
  evaluatedBy: string;
  defaultSurface?: GovernanceSurface;
  now?: () => Date;
  engineFactory?: (rules: PolicyRule[]) => PolicyEvaluator;
}

export interface PolicyEvaluator {
  evaluate: (request: PolicyEvaluationRequest) => PolicyEvaluationResult;
}

function mapEffectToStatus(effect: PolicyEffect): GovernanceVerdictStatus {
  if (effect === "deny") {
    return "REJECTED";
  }
  return effect === "allow" ? "APPROVED" : "REQUIRES_REVIEW";
}

export function buildGovernanceVerdict(
  request: PolicyEvaluationRequest,
  evaluation: PolicyEvaluationResult,
  options: {
    evaluatedBy: string;
    surface: GovernanceSurface;
    recommendations?: string[];
    evidence?: Record<string, unknown>;
    runtime?: GovernanceVerdict["runtime"];
    now?: () => Date;
  }
): GovernanceVerdict {
  return {
    id: randomUUID(),
    status: mapEffectToStatus(evaluation.effect),
    action: request.action,
    resource: request.resource,
    policyIds: evaluation.matchedRules,
    matchedRules: evaluation.matchedRules,
    reasons: evaluation.reasons,
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    evaluatedBy: options.evaluatedBy,
    surface: options.surface,
    recommendations: options.recommendations,
    evidence: options.evidence,
    runtime: options.runtime,
    actor: {
      tenantId: request.context.tenantId,
      userId: request.context.userId,
      roles: request.context.roles,
      region: request.context.region,
    },
  };
}

export class GovernanceOrchestrator {
  private readonly evaluatedBy: string;
  private readonly defaultSurface: GovernanceSurface;
  private readonly now: () => Date;
  private readonly engine: PolicyEvaluator;
  private readonly engineFactory?: GovernanceOrchestratorOptions["engineFactory"];

  constructor(engine: PolicyEvaluator, options: GovernanceOrchestratorOptions) {
    this.engine = engine;
    this.evaluatedBy = options.evaluatedBy;
    this.defaultSurface = options.defaultSurface ?? "microservice";
    this.now = options.now ?? (() => new Date());
    this.engineFactory = options.engineFactory;
  }

  evaluateUserAction(
    request: PolicyEvaluationRequest,
    opts: { surface?: GovernanceSurface; dynamicRules?: PolicyRule[] } = {}
  ): GovernedEnvelope<PolicyEvaluationResult> {
    return this.evaluate(request, {
      surface: opts.surface ?? this.defaultSurface,
      dynamicRules: opts.dynamicRules,
    });
  }

  evaluateRecommendation(
    recommendation: { id: string; kind: string; content: string },
    request: PolicyEvaluationRequest,
    opts: { surface?: GovernanceSurface; dynamicRules?: PolicyRule[] } = {}
  ): GovernedEnvelope<{ recommendation: typeof recommendation; policy: PolicyEvaluationResult }> {
    const governed = this.evaluate(request, {
      surface: opts.surface ?? "ui",
      dynamicRules: opts.dynamicRules,
    });

    return {
      payload: {
        recommendation,
        policy: governed.payload,
      },
      governance: governed.governance,
    };
  }

  evaluateOutput<TPayload>(
    payload: TPayload,
    request: PolicyEvaluationRequest,
    opts: { surface?: GovernanceSurface; dynamicRules?: PolicyRule[] } = {}
  ): GovernedEnvelope<TPayload> {
    const governed = this.evaluate(request, {
      surface: opts.surface ?? "workflow",
      dynamicRules: opts.dynamicRules,
    });

    return {
      payload,
      governance: governed.governance,
    };
  }

  validateWorkflow(
    workflow: WorkflowDefinition,
    validation: WorkflowValidationResult,
    opts: { surface?: GovernanceSurface; dynamicRules?: PolicyRule[] } = {}
  ): GovernedEnvelope<WorkflowValidationResult> {
    const request: PolicyEvaluationRequest = {
      action: "workflow:validate",
      resource: workflow.id ?? "workflow",
      context: {
        tenantId: workflow.tenantId ?? "unknown",
        userId: workflow.owner ?? "system",
        roles: workflow.roles ?? ["system"],
        region: workflow.region,
      },
    };

    const issues = validation.issues ?? [];
    const effect: PolicyEffect = issues.some((issue) => issue.severity === "error")
      ? "deny"
      : "allow";

    const evaluation: PolicyEvaluationResult = {
      allowed: effect === "allow",
      effect,
      matchedRules: issues.map((issue) => issue.ruleId ?? "validation"),
      reasons: issues.map((issue) => issue.message),
      obligations: [],
      trace: issues.map((issue) => ({
        ruleId: issue.ruleId ?? "validation",
        matched: true,
        reasons: [issue.message],
      })),
    };

    const governed = this.evaluate(request, {
      surface: opts.surface ?? "workflow",
      dynamicRules: opts.dynamicRules,
      evaluation,
    });

    return {
      payload: validation,
      governance: governed.governance,
    };
  }

  private evaluate(
    request: PolicyEvaluationRequest,
    opts: {
      surface: GovernanceSurface;
      dynamicRules?: PolicyRule[];
      evaluation?: PolicyEvaluationResult;
    }
  ): GovernedEnvelope<PolicyEvaluationResult> {
    const start = performance.now();
    const engine =
      opts.dynamicRules && this.engineFactory ? this.engineFactory(opts.dynamicRules) : this.engine;
    const evaluation = opts.evaluation ?? engine.evaluate(request);
    const governance = buildGovernanceVerdict(request, evaluation, {
      evaluatedBy: this.evaluatedBy,
      surface: opts.surface,
      now: this.now,
      runtime: {
        latencyMs: performance.now() - start,
        dynamicRulesApplied: opts.dynamicRules?.map((rule) => rule.id),
      },
    });

    assertGovernanceIntegrity({ payload: evaluation, governance });

    return { payload: evaluation, governance };
  }
}

export function assertGovernanceIntegrity<T>(envelope: GovernedEnvelope<T>): void {
  if (!envelope || !envelope.governance) {
    throw new Error("Governance verdict missing from envelope");
  }
  const { governance } = envelope;
  if (!governance.id || !governance.timestamp) {
    throw new Error("Governance verdict is incomplete");
  }
}

export interface AdversarialProbe {
  name: string;
  request: PolicyEvaluationRequest;
  dynamicRules?: PolicyRule[];
  expectedStatus?: GovernanceVerdictStatus;
  expectedReasons?: string[];
}

export interface AdversarialProbeResult {
  name: string;
  verdict: GovernanceVerdict;
  bypassDetected: boolean;
}

export function runAdversarialProbes(
  orchestrator: GovernanceOrchestrator,
  probes: AdversarialProbe[]
): AdversarialProbeResult[] {
  return probes.map((probe) => {
    const outcome = orchestrator.evaluateUserAction(probe.request, {
      dynamicRules: probe.dynamicRules,
    });

    const bypassDetected =
      (probe.expectedStatus && outcome.governance.status !== probe.expectedStatus) ||
      (probe.expectedReasons &&
        !probe.expectedReasons.every((reason) => outcome.governance.reasons.includes(reason)));

    return {
      name: probe.name,
      verdict: outcome.governance,
      bypassDetected,
    };
  });
}

export function summarizeWorkflowIssues(issues: WorkflowValidationIssue[]): string[] {
  return issues.map(
    (issue) => `${issue.severity}:${issue.ruleId ?? "validation"}:${issue.message}`
  );
}
