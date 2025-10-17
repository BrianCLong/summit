import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PolicyActorContext,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
} from '@ga-graphai/common-types';
import {
  GenerativeActionTranslator,
  type GenerativeActionTranslatorOptions,
  type OrchestrationIntent,
} from '../../src/gen-actions/intentTranslator.js';
import {
  OrchestrationKnowledgeGraph,
  type PipelineConnector,
  type ServiceConnector,
  type EnvironmentConnector,
  type IncidentConnector,
  type PolicyConnector,
} from '@ga-graphai/knowledge-graph';

const ALLOW: PolicyEvaluationResult = {
  allowed: true,
  effect: 'allow',
  matchedRules: ['policy-1'],
  reasons: [],
  obligations: [],
  trace: [],
};

const DENY: PolicyEvaluationResult = {
  allowed: false,
  effect: 'deny',
  matchedRules: ['policy-deny'],
  reasons: ['Denied by policy-deny'],
  obligations: [],
  trace: [],
};

describe('GenerativeActionTranslator', () => {
  let knowledgeGraph: OrchestrationKnowledgeGraph;
  let policyEvaluator: GenerativeActionTranslatorOptions['policyEvaluator'];
  let auditSink: { record: ReturnType<typeof vi.fn> };
  let approvalQueue: { enqueue: ReturnType<typeof vi.fn> };
  let baseContext: PolicyActorContext;

  beforeEach(async () => {
    knowledgeGraph = new OrchestrationKnowledgeGraph();
    const serviceConnector: ServiceConnector = {
      loadServices: vi.fn().mockResolvedValue([
        { id: 'svc-api', name: 'API', dependencies: [], tier: 'tier-0' },
      ]),
    };
    const environmentConnector: EnvironmentConnector = {
      loadEnvironments: vi.fn().mockResolvedValue([
        { id: 'env-prod', name: 'Prod', stage: 'prod', region: 'us-east-1' },
      ]),
    };
    const pipelineConnector: PipelineConnector = {
      loadPipelines: vi.fn().mockResolvedValue([
        {
          id: 'pipeline-1',
          name: 'Deploy API',
          stages: [
            {
              id: 'stage-build',
              name: 'Build',
              pipelineId: 'pipeline-1',
              serviceId: 'svc-api',
              environmentId: 'env-prod',
              capability: 'build',
            },
          ],
        },
      ]),
    };
    const incidentConnector: IncidentConnector = {
      loadIncidents: vi.fn().mockResolvedValue([
        {
          id: 'incident-1',
          serviceId: 'svc-api',
          environmentId: 'env-prod',
          severity: 'critical',
          occurredAt: new Date().toISOString(),
          status: 'open',
        },
      ]),
    };
    const policyConnector: PolicyConnector = {
      loadPolicies: vi.fn().mockResolvedValue([
        {
          id: 'policy-1',
          description: 'Prod deploy guardrail',
          effect: 'allow',
          actions: ['orchestration.deploy'],
          resources: ['service:svc-api'],
          conditions: [],
          obligations: [],
          tags: ['high-risk'],
        },
      ]),
    };

    knowledgeGraph.registerServiceConnector(serviceConnector);
    knowledgeGraph.registerEnvironmentConnector(environmentConnector);
    knowledgeGraph.registerPipelineConnector(pipelineConnector);
    knowledgeGraph.registerIncidentConnector(incidentConnector);
    knowledgeGraph.registerPolicyConnector(policyConnector);
    await knowledgeGraph.refresh();

    policyEvaluator = vi.fn<(request: PolicyEvaluationRequest) => PolicyEvaluationResult>().mockReturnValue(ALLOW);
    auditSink = { record: vi.fn() };
    approvalQueue = { enqueue: vi.fn() };
    baseContext = { tenantId: 'tenant', userId: 'user', roles: ['developer'] };
  });

  it('produces plan with approval requirement when risk high', () => {
    const translator = new GenerativeActionTranslator({
      knowledgeGraph,
      policyEvaluator,
      auditSink,
      approvalQueue,
    });

    const intent: OrchestrationIntent = {
      type: 'deploy',
      targetServiceId: 'svc-api',
      environmentId: 'env-prod',
      requestedBy: baseContext,
    };

    const plan = translator.translate(intent);

    expect(plan.guardrail.requiresApproval).toBe(true);
    expect(approvalQueue.enqueue).toHaveBeenCalledWith(plan);
    expect(auditSink.record).toHaveBeenCalled();
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].command).toContain('orchestrator validate');
  });

  it('infers environment when not provided and builds rollback intent', () => {
    const translator = new GenerativeActionTranslator({
      knowledgeGraph,
      policyEvaluator,
      auditSink,
    });

    const intent: OrchestrationIntent = {
      type: 'rollback',
      targetServiceId: 'svc-api',
      requestedBy: baseContext,
      riskTolerance: 'high',
    };

    const plan = translator.translate(intent);
    expect(plan.intent.environmentId).toBe('env-prod');
    expect(plan.steps[0].command).toContain('rollback');
    expect(plan.guardrail.requiresApproval).toBe(false);
  });

  it('throws when policy denies action', () => {
    const translator = new GenerativeActionTranslator({
      knowledgeGraph,
      policyEvaluator: vi.fn().mockReturnValue(DENY),
    });

    expect(() =>
      translator.translate({
        type: 'scale',
        targetServiceId: 'svc-api',
        environmentId: 'env-prod',
        desiredCapacity: 3,
        requestedBy: baseContext,
      }),
    ).toThrow(/policy denied action/);
  });
});
