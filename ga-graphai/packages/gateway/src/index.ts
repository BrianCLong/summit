import { createHash, createHmac } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type {
  EvidenceBundle,
  LedgerEntry,
  LedgerFactInput,
  BudgetResult,
  CursorEvent,
  PolicyDecision,
  ProvenanceRecord as CursorProvenanceRecord,
  RateLimitResult,
  LedgerContext,
  LedgerRecord,
  WorkflowDefinition,
  WorkflowRunRecord,
  PolicyMetadata,
  PolicyTag,
  ProvenanceRecord as CoopProvenanceRecord,
} from 'common-types';
import {
  buildLedgerUri,
  collectEvidencePointers,
  normalizeWorkflow,
} from 'common-types';

// ============================================================================
// GraphQL Gateway - From HEAD
// ============================================================================

// LinearX Orchestration System
import {
  LINEARX_SPEC,
  LinearXOrchestratorSpec,
  ProviderResolutionOptions,
  ProviderRoute,
  ToolContract,
  LinearXQuickNextStep,
  LinearXShortQuestionAnswer,
  LinearXKeyboardShortcut,
  LinearXCommandPaletteIntent,
  LinearXCommandPaletteCategory,
  LinearXCommandPaletteManifest,
  LinearXKeyboardShortcutMap,
  LinearXBoardEnhancement,
  LinearXGraphQLBinding,
  LinearXGuardedInvocationPlan,
  resolveProviderForTag,
  listToolContract,
  summarizeQuickStart,
  answerShortQuestion,
  listKeyboardShortcuts,
  listCommandPaletteIntents,
  listCommandPaletteCategories,
  listBoardEnhancements,
  listGraphQLBindings,
  planGuardedInvocationForBinding,
  buildCommandPaletteManifest,
  buildKeyboardShortcutMap,
  generateGraphQLSchemaSDL,
} from '../../common-types/src/linearx';

import type {
  AssignmentPlan,
  AutomationCommand,
  AutomationMode,
  ManualControlPlan,
  TicketDescriptor,
  WorkParcelPlan,
  WorkerDescriptor,
} from '../../common-types/src/index.js';

// Policy-Aware Workcell System
import type { ValueNode } from 'graphql';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  graphql,
} from 'graphql';
import type {
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule,
  WorkOrderResult,
  WorkOrderSubmission,
  WorkcellAgentDefinition,
  WorkcellToolDefinition,
} from '../../common-types/src/index.js';
import { PolicyEngine, buildDefaultPolicyEngine } from 'policy';
import { ProvenanceLedger } from 'prov-ledger';
import { WorkcellRuntime } from 'workcell-runtime';
import type { GraphQLRateLimiterOptions } from './graphql-cost.js';
import { GraphQLRateLimiter } from './graphql-cost.js';

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
      return Number.parseInt(ast.value, 10);
    case Kind.FLOAT:
      return Number.parseFloat(ast.value);
    case Kind.OBJECT: {
      const value: Record<string, unknown> = {};
      for (const field of ast.fields) {
        value[field.name.value] = parseJsonLiteral(field.value);
      }
      return value;
    }
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: parseJsonLiteral,
});

interface GatewayContext {
  policy: PolicyEngine;
  ledger: ProvenanceLedger;
  workcell: WorkcellRuntime;
}

const PolicyEffectEnum = new GraphQLEnumType({
  name: 'PolicyEffect',
  values: {
    ALLOW: { value: 'allow' },
    DENY: { value: 'deny' },
  },
});

const PolicyObligationType = new GraphQLObjectType({
  name: 'PolicyObligation',
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    configuration: { type: GraphQLJSON },
  },
});

const PolicyTraceType = new GraphQLObjectType({
  name: 'PolicyTrace',
  fields: {
    ruleId: { type: new GraphQLNonNull(GraphQLString) },
    matched: { type: new GraphQLNonNull(GraphQLBoolean) },
    reasons: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
  },
});

const PolicyEvaluationType = new GraphQLObjectType({
  name: 'PolicyEvaluation',
  fields: {
    allowed: { type: new GraphQLNonNull(GraphQLBoolean) },
    effect: { type: new GraphQLNonNull(PolicyEffectEnum) },
    matchedRules: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    reasons: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    obligations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(PolicyObligationType)),
      ),
    },
    trace: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(PolicyTraceType)),
      ),
    },
  },
});

const WorkTaskStatusEnum = new GraphQLEnumType({
  name: 'WorkTaskStatus',
  values: {
    SUCCESS: { value: 'success' },
    REJECTED: { value: 'rejected' },
    FAILED: { value: 'failed' },
  },
});

const WorkOrderStatusEnum = new GraphQLEnumType({
  name: 'WorkOrderStatus',
  values: {
    COMPLETED: { value: 'completed' },
    PARTIAL: { value: 'partial' },
    REJECTED: { value: 'rejected' },
  },
});

const LedgerEntryType = new GraphQLObjectType({
  name: 'LedgerEntry',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    actor: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    payload: { type: new GraphQLNonNull(GraphQLJSON) },
    timestamp: { type: new GraphQLNonNull(GraphQLString) },
    hash: { type: new GraphQLNonNull(GraphQLString) },
    previousHash: { type: GraphQLString },
  },
});

const PolicyRuleType = new GraphQLObjectType({
  name: 'PolicyRule',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    effect: { type: new GraphQLNonNull(PolicyEffectEnum) },
    actions: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    resources: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    tags: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  },
});

const WorkTaskResultType = new GraphQLObjectType({
  name: 'WorkTaskResult',
  fields: {
    taskId: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(WorkTaskStatusEnum) },
    logs: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    output: { type: new GraphQLNonNull(GraphQLJSON) },
  },
});

const WorkOrderResultType = new GraphQLObjectType({
  name: 'WorkOrderResult',
  fields: {
    orderId: { type: new GraphQLNonNull(GraphQLString) },
    submittedBy: { type: new GraphQLNonNull(GraphQLString) },
    agentName: { type: new GraphQLNonNull(GraphQLString) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(WorkOrderStatusEnum) },
    startedAt: { type: new GraphQLNonNull(GraphQLString) },
    finishedAt: { type: new GraphQLNonNull(GraphQLString) },
    tasks: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(WorkTaskResultType)),
      ),
    },
    obligations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(PolicyObligationType)),
      ),
    },
    reasons: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
  },
});

const LedgerEntryInput = new GraphQLInputObjectType({
  name: 'LedgerEntryInput',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    actor: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    payload: { type: new GraphQLNonNull(GraphQLJSON) },
    timestamp: { type: GraphQLString },
  },
});

const PolicyEvaluationInput = new GraphQLInputObjectType({
  name: 'PolicyEvaluationInput',
  fields: {
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
    roles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    region: { type: GraphQLString },
    attributes: { type: GraphQLJSON },
  },
});

const WorkTaskInputType = new GraphQLInputObjectType({
  name: 'WorkTaskInput',
  fields: {
    taskId: { type: new GraphQLNonNull(GraphQLString) },
    tool: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    payload: { type: new GraphQLNonNull(GraphQLJSON) },
    requiredAuthority: { type: GraphQLInt },
  },
});

const WorkOrderInputType = new GraphQLInputObjectType({
  name: 'WorkOrderInput',
  fields: {
    orderId: { type: new GraphQLNonNull(GraphQLString) },
    submittedBy: { type: new GraphQLNonNull(GraphQLString) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
    agentName: { type: new GraphQLNonNull(GraphQLString) },
    roles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    region: { type: GraphQLString },
    attributes: { type: GraphQLJSON },
    metadata: { type: GraphQLJSON },
    tasks: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(WorkTaskInputType)),
      ),
    },
  },
});

function buildSchema(): GraphQLSchema {
  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      ledgerEntries: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(LedgerEntryType)),
        ),
        args: {
          category: { type: GraphQLString },
          limit: { type: GraphQLInt },
        },
        resolve: (
          _source,
          args: { category?: string; limit?: number },
          context: GatewayContext,
        ) => context.ledger.list(args),
      },
      policyRules: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(PolicyRuleType)),
        ),
        resolve: (_source, _args, context: GatewayContext): PolicyRule[] =>
          context.policy.getRules(),
      },
      workOrders: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(WorkOrderResultType)),
        ),
        resolve: (_source, _args, context: GatewayContext): WorkOrderResult[] =>
          context.workcell.listOrders(),
      },
    },
  });

  const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      appendLedgerEntry: {
        type: new GraphQLNonNull(LedgerEntryType),
        args: {
          input: { type: new GraphQLNonNull(LedgerEntryInput) },
        },
        resolve: (
          _source,
          args: { input: LedgerFactInput },
          context: GatewayContext,
        ): LedgerEntry => context.ledger.append(args.input),
      },
      simulatePolicy: {
        type: new GraphQLNonNull(PolicyEvaluationType),
        args: {
          input: { type: new GraphQLNonNull(PolicyEvaluationInput) },
        },
        resolve: (
          _source,
          args: {
            input: {
              action: string;
              resource: string;
              tenantId: string;
              userId: string;
              roles: string[];
              region?: string;
              attributes?: Record<string, string | number | boolean>;
            };
          },
          context: GatewayContext,
        ): PolicyEvaluationResult => {
          const request: PolicyEvaluationRequest = {
            action: args.input.action,
            resource: args.input.resource,
            context: {
              tenantId: args.input.tenantId,
              userId: args.input.userId,
              roles: args.input.roles,
              region: args.input.region,
              attributes: args.input.attributes,
            },
          };
          return context.policy.evaluate(request);
        },
      },
      submitWorkOrder: {
        type: new GraphQLNonNull(WorkOrderResultType),
        args: {
          input: { type: new GraphQLNonNull(WorkOrderInputType) },
        },
        resolve: async (
          _source,
          args: {
            input: {
              orderId: string;
              submittedBy: string;
              tenantId: string;
              userId: string;
              agentName: string;
              roles: string[];
              region?: string;
              attributes?: Record<string, string | number | boolean>;
              metadata?: Record<string, unknown>;
              tasks: Array<{
                taskId: string;
                tool: string;
                action: string;
                resource: string;
                payload: Record<string, unknown>;
                requiredAuthority?: number;
              }>;
            };
          },
          context: GatewayContext,
        ): Promise<WorkOrderResult> => {
          const submission: WorkOrderSubmission = {
            orderId: args.input.orderId,
            submittedBy: args.input.submittedBy,
            tenantId: args.input.tenantId,
            userId: args.input.userId,
            agentName: args.input.agentName,
            roles: args.input.roles,
            region: args.input.region,
            attributes: args.input
              .attributes as WorkOrderSubmission['attributes'],
            metadata: args.input.metadata as WorkOrderSubmission['metadata'],
            tasks: args.input.tasks.map((task) => ({
              taskId: task.taskId,
              tool: task.tool,
              action: task.action,
              resource: task.resource,
              payload: task.payload as Record<string, unknown>,
              requiredAuthority: task.requiredAuthority ?? undefined,
            })),
          };
          return context.workcell.submitOrder(submission);
        },
      },
    },
  });

  return new GraphQLSchema({ query: queryType, mutation: mutationType });
}

export interface GatewayWorkcellOptions {
  tools?: WorkcellToolDefinition[];
  agents?: WorkcellAgentDefinition[];
}

export interface GatewayCostGuardOptions extends GraphQLRateLimiterOptions {
  enabled?: boolean;
  defaultTenantId?: string;
}

export interface GatewayExecutionOptions {
  tenantId?: string;
}

export interface GatewayOptions {
  rules?: PolicyRule[];
  seedEntries?: LedgerFactInput[];
  workcell?: GatewayWorkcellOptions;
  costGuard?: GatewayCostGuardOptions;
}

export class GatewayRuntime {
  private readonly policy: PolicyEngine;
  private readonly ledger: ProvenanceLedger;
  private readonly schema: GraphQLSchema;
  private readonly workcell: WorkcellRuntime;
  private readonly costGuardOptions?: GatewayCostGuardOptions;
  private readonly rateLimiter?: GraphQLRateLimiter;
  private readonly defaultTenantId: string;

  constructor(options: GatewayOptions = {}) {
    this.policy = options.rules
      ? new PolicyEngine(options.rules)
      : buildDefaultPolicyEngine();
    this.ledger = new ProvenanceLedger();
    if (options.seedEntries) {
      for (const entry of options.seedEntries) {
        this.ledger.append(entry);
      }
    }
    this.workcell = new WorkcellRuntime({
      policy: this.policy,
      ledger: this.ledger,
      tools: options.workcell?.tools,
      agents: options.workcell?.agents,
    });
    this.costGuardOptions = options.costGuard;
    this.defaultTenantId = this.costGuardOptions?.defaultTenantId ?? 'public';
    if (!options.workcell?.tools || options.workcell.tools.length === 0) {
      this.workcell.registerTool({
        name: 'analysis',
        minimumAuthority: 1,
        handler: (task, context) => ({
          message: `analysis completed for ${context.orderId}`,
          echo: task.payload,
        }),
      });
    }
    if (!options.workcell?.agents || options.workcell.agents.length === 0) {
      this.workcell.registerAgent({
        name: 'baseline-agent',
        authority: 2,
        allowedTools: ['analysis'],
        roles: ['developer'],
      });
    }
    this.schema = buildSchema();
    if (this.costGuardOptions?.enabled !== false) {
      const { enabled: _enabled, defaultTenantId: _defaultTenantId, ...rateLimiterOptions } =
        this.costGuardOptions ?? {};
      this.rateLimiter = new GraphQLRateLimiter(this.schema, rateLimiterOptions);
    }
  }

  async execute(
    source: string,
    variableValues?: Record<string, unknown>,
    options?: GatewayExecutionOptions,
  ) {
    const tenantId = options?.tenantId ?? this.defaultTenantId;
    const guard = this.rateLimiter;
    if (guard) {
      const evaluation = guard.beginExecution(source, tenantId);
      if (evaluation.decision.action === 'kill' || evaluation.decision.action === 'throttle') {
        return {
          data: null,
          errors: [
            new GraphQLError(evaluation.decision.reason, {
              extensions: {
                code:
                  evaluation.decision.action === 'kill'
                    ? 'COST_GUARD_KILL'
                    : 'COST_GUARD_THROTTLE',
                retryAfterMs: evaluation.decision.nextCheckMs,
                metrics: evaluation.decision.metrics,
                plan: evaluation.plan,
              },
            }),
          ],
        };
      }
      const startedAt = performance.now();
      try {
        return await graphql({
          schema: this.schema,
          source,
          variableValues,
          contextValue: {
            policy: this.policy,
            ledger: this.ledger,
            workcell: this.workcell,
          },
        });
      } finally {
        evaluation.release?.(performance.now() - startedAt);
      }
    }

    return graphql({
      schema: this.schema,
      source,
      variableValues,
      contextValue: {
        policy: this.policy,
        ledger: this.ledger,
        workcell: this.workcell,
      },
    });
  }

  getSchema(): GraphQLSchema {
    return this.schema;
  }
}
// LinearX Orchestration Classes
export interface GraphQLResolverBlueprint {
  binding: LinearXGraphQLBinding;
  invocation: LinearXGuardedInvocationPlan;
  resolverSignature: string;
  guardrails: string[];
  relatedShortcuts: LinearXKeyboardShortcut[];
  relatedIntents: LinearXCommandPaletteIntent[];
}

export interface IntegrationBlueprint {
  quickSteps: string[];
  graphqlResolvers: GraphQLResolverBlueprint[];
  graphqlSchemaSDL: string;
  keyboardShortcuts: LinearXKeyboardShortcut[];
  keyboardShortcutMap: LinearXKeyboardShortcutMap;
  boardEnhancements: LinearXBoardEnhancement[];
  commandPaletteIntents: LinearXCommandPaletteIntent[];
  commandPaletteCategories: LinearXCommandPaletteCategory[];
  commandPaletteManifest: LinearXCommandPaletteManifest;
}

export interface ProviderSelectionResult {
  tag: string;
  provider: string;
  usedFallback: boolean;
  route?: ProviderRoute;
}

interface ManualOverride {
  readonly ticketId: string;
  readonly workerId: string;
}

const DEFAULT_GUIDED_PLAN: ManualControlPlan = {
  mode: 'guided',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_MANUAL_PLAN: ManualControlPlan = {
  mode: 'manual',
  pauseBeforeNavigation: true,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_AUTOMATION_PLAN: ManualControlPlan = {
  mode: 'auto',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: false,
  pauseBeforeCapture: false,
};

function capabilityScore(
  ticket: TicketDescriptor,
  worker: WorkerDescriptor,
): number {
  const required = new Set(
    ticket.requiredCapabilities.map((cap) => cap.toLowerCase()),
  );
  return worker.capabilities.reduce((score, capability) => {
    if (required.has(capability.skill.toLowerCase())) {
      return score + capability.weight;
    }
    return score;
  }, 0);
}

function automationPlanFor(mode: AutomationMode): ManualControlPlan {
  switch (mode) {
    case 'manual':
      return DEFAULT_MANUAL_PLAN;
    case 'guided':
      return DEFAULT_GUIDED_PLAN;
    default:
      return DEFAULT_AUTOMATION_PLAN;
  }
}

export class LinearXOrchestrator {
  private readonly spec: LinearXOrchestratorSpec;

  constructor(spec: LinearXOrchestratorSpec = LINEARX_SPEC) {
    this.spec = spec;
  }

  getSystemPrompt(): string {
    return this.spec.systemPrompt;
  }

  getQualityGates() {
    return { ...this.spec.qualityGates };
  }

  getFallbackChain(): string[] {
    return [...this.spec.fallbackChain];
  }

  selectProvider(
    tag: string,
    options: ProviderResolutionOptions = {},
  ): ProviderSelectionResult {
    const provider = resolveProviderForTag(tag, options, this.spec);
    const route = this.spec.providerRouting.find((candidate) =>
      candidate.tags.includes(tag),
    );
    const usedFallback = route
      ? provider !== route.primary
      : provider !== this.spec.fallbackChain[0];
    return {
      tag,
      provider,
      usedFallback,
      route,
    };
  }

  explainProvider(tag: string, options: ProviderResolutionOptions = {}) {
    const selection = this.selectProvider(tag, options);
    const chain = selection.route
      ? [selection.route.primary, ...selection.route.fallbacks]
      : [...this.spec.fallbackChain];
    return {
      ...selection,
      chain,
      qualityGates: this.getQualityGates(),
      reason: selection.usedFallback ? 'fallback' : 'primary',
    };
  }

  listProviderRoutes(): ProviderRoute[] {
    return [...this.spec.providerRouting];
  }

  listToolContracts(): ToolContract[] {
    return listToolContract() as ToolContract[];
  }

  getToolContract(name: string): ToolContract | undefined {
    return listToolContract(name) as ToolContract | undefined;
  }

  getQuickNextSteps(): LinearXQuickNextStep[] {
    return [...this.spec.quickNextSteps];
  }

  getQuickStartChecklist(): string[] {
    return summarizeQuickStart();
  }

  getShortAnswers(): LinearXShortQuestionAnswer[] {
    return [...this.spec.shortAnswers];
  }

  answerShortQuestion(question: string): string | undefined {
    return answerShortQuestion(question);
  }

  getKeyboardShortcuts(): LinearXKeyboardShortcut[] {
    return listKeyboardShortcuts() as LinearXKeyboardShortcut[];
  }

  getKeyboardShortcut(action: string): LinearXKeyboardShortcut | undefined {
    return listKeyboardShortcuts(action) as LinearXKeyboardShortcut | undefined;
  }

  getCommandPaletteIntents(): LinearXCommandPaletteIntent[] {
    return listCommandPaletteIntents() as LinearXCommandPaletteIntent[];
  }

  getCommandPaletteIntent(id: string): LinearXCommandPaletteIntent | undefined {
    return listCommandPaletteIntents(id) as
      | LinearXCommandPaletteIntent
      | undefined;
  }

  getCommandPaletteCategories(): LinearXCommandPaletteCategory[] {
    return listCommandPaletteCategories() as LinearXCommandPaletteCategory[];
  }

  getCommandPaletteCategory(
    id: string,
  ): LinearXCommandPaletteCategory | undefined {
    return listCommandPaletteCategories(id) as
      | LinearXCommandPaletteCategory
      | undefined;
  }

  getCommandPaletteManifest(): LinearXCommandPaletteManifest {
    return buildCommandPaletteManifest();
  }

  getBoardEnhancements(): LinearXBoardEnhancement[] {
    return listBoardEnhancements() as LinearXBoardEnhancement[];
  }

  getBoardEnhancement(feature: string): LinearXBoardEnhancement | undefined {
    return listBoardEnhancements(feature) as
      | LinearXBoardEnhancement
      | undefined;
  }

  getGraphQLBindings(): LinearXGraphQLBinding[] {
    return listGraphQLBindings() as LinearXGraphQLBinding[];
  }

  getGraphQLBinding(field: string): LinearXGraphQLBinding | undefined {
    return listGraphQLBindings(field) as LinearXGraphQLBinding | undefined;
  }

  getGraphQLSchemaSDL(): string {
    return generateGraphQLSchemaSDL();
  }

  getKeyboardShortcutMap(): LinearXKeyboardShortcutMap {
    return buildKeyboardShortcutMap();
  }

  planGraphQLResolver(field: string): GraphQLResolverBlueprint | undefined {
    const binding = this.getGraphQLBinding(field);
    if (!binding) {
      return undefined;
    }
    const invocation = planGuardedInvocationForBinding(binding);
    if (!invocation) {
      return undefined;
    }
    const relatedShortcuts = binding.keyboardShortcutAction
      ? this.getKeyboardShortcuts().filter(
          (shortcut) => shortcut.action === binding.keyboardShortcutAction,
        )
      : [];
    const relatedIntents = binding.commandPaletteIntentId
      ? this.getCommandPaletteIntents().filter(
          (intent) => intent.id === binding.commandPaletteIntentId,
        )
      : [];
    const resolverSignature = `${binding.operation === 'Mutation' ? 'extend type Mutation' : 'extend type Query'} { ${binding.field}(input: ${binding.inputType}) : ${binding.returnType} }`;
    return {
      binding,
      invocation,
      resolverSignature,
      guardrails: [...binding.guardrails],
      relatedShortcuts,
      relatedIntents,
    };
  }

  buildIntegrationBlueprint(): IntegrationBlueprint {
    const resolverPlans = this.getGraphQLBindings()
      .map((binding) => this.planGraphQLResolver(binding.field))
      .filter((plan): plan is GraphQLResolverBlueprint => Boolean(plan));
    return {
      quickSteps: this.getQuickStartChecklist(),
      graphqlResolvers: resolverPlans,
      graphqlSchemaSDL: this.getGraphQLSchemaSDL(),
      keyboardShortcuts: this.getKeyboardShortcuts(),
      keyboardShortcutMap: this.getKeyboardShortcutMap(),
      boardEnhancements: this.getBoardEnhancements(),
      commandPaletteIntents: this.getCommandPaletteIntents(),
      commandPaletteCategories: this.getCommandPaletteCategories(),
      commandPaletteManifest: this.getCommandPaletteManifest(),
    };
  }

  describe(): LinearXOrchestratorSpec {
    return {
      ...this.spec,
      providerRouting: this.listProviderRoutes(),
      fallbackChain: this.getFallbackChain(),
      toolContracts: this.listToolContracts(),
      quickNextSteps: this.getQuickNextSteps(),
      shortAnswers: this.getShortAnswers(),
      keyboardShortcuts: this.getKeyboardShortcuts(),
      commandPaletteIntents: this.getCommandPaletteIntents(),
      commandPaletteCategories: this.getCommandPaletteCategories(),
      boardEnhancements: this.getBoardEnhancements(),
      graphqlBindings: this.getGraphQLBindings(),
    };
  }
}

export class WorkloadAllocator {
  private readonly overrides = new Map<string, string>();

  constructor(private readonly workers: readonly WorkerDescriptor[]) {
    if (!workers.length) {
      throw new Error('WorkloadAllocator requires at least one worker profile');
    }
  }

  public registerOverrides(overrides: readonly ManualOverride[]): void {
    overrides.forEach((override) => {
      this.overrides.set(override.ticketId, override.workerId);
    });
  }

  public plan(tickets: readonly TicketDescriptor[]): AssignmentPlan {
    const parcels: WorkParcelPlan[] = [];
    const unassigned: TicketDescriptor[] = [];
    const mutableWorkers = this.workers.map((worker) => ({ ...worker }));

    tickets
      .slice()
      .sort((a, b) => b.priority - a.priority)
      .forEach((ticket) => {
        const parcel = this.planTicket(ticket, mutableWorkers);
        if (parcel) {
          parcels.push(parcel);
        } else {
          unassigned.push(ticket);
        }
      });

    return { parcels, unassigned };
  }

  private planTicket(
    ticket: TicketDescriptor,
    workers: WorkerDescriptor[],
  ): WorkParcelPlan | undefined {
    const overrideWorkerId = this.overrides.get(ticket.id);
    const eligibleWorkers = workers
      .filter((worker) => worker.currentLoad < worker.maxConcurrent)
      .map((worker) => ({
        worker,
        score: capabilityScore(ticket, worker),
        remainingCapacity: worker.maxConcurrent - worker.currentLoad,
      }))
      .filter((entry) => entry.score > 0 || Boolean(overrideWorkerId));

    if (!eligibleWorkers.length) {
      return undefined;
    }

    let selection = eligibleWorkers[0];
    if (overrideWorkerId) {
      const overridden = eligibleWorkers.find(
        (entry) => entry.worker.id === overrideWorkerId,
      );
      if (overridden) {
        selection = overridden;
      }
    } else {
      selection = eligibleWorkers.slice().sort((a, b) => {
        if (b.score === a.score) {
          return b.remainingCapacity - a.remainingCapacity;
        }
        return b.score - a.score;
      })[0];
    }

    selection.worker.currentLoad += 1;

    return {
      ticket,
      worker: selection.worker,
      manualControl: automationPlanFor(ticket.automationMode),
      expectedEffortMinutes: this.estimateEffort(ticket),
    };
  }

  private estimateEffort(ticket: TicketDescriptor): number {
    const base = 30;
    const priorityAdjustment = Math.max(0, ticket.priority - 1) * 5;
    const manualMultiplier =
      ticket.automationMode === 'manual'
        ? 2
        : ticket.automationMode === 'guided'
          ? 1.3
          : 1;
    return Math.ceil((base + priorityAdjustment) * manualMultiplier);
  }
}

export class AutomationCommandBuilder {
  constructor(private readonly allocator: WorkloadAllocator) {}

  public createCommands(
    tickets: readonly TicketDescriptor[],
  ): AutomationCommand[] {
    const plan = this.allocator.plan(tickets);
    return plan.parcels.map((parcel) => this.createCommand(parcel));
  }

  public createCommand(parcel: WorkParcelPlan): AutomationCommand {
    const composedPrompt = this.composePrompt(parcel);
    const metadata = {
      manualControl: parcel.manualControl,
      workerId: parcel.worker.id,
      ticketId: parcel.ticket.id,
      entryUrl: parcel.ticket.entryUrl,
    };
    return { parcel, composedPrompt, metadata };
  }

  private composePrompt(parcel: WorkParcelPlan): string {
    const tuning = parcel.ticket.llmCommand.tuning;
    const instruction = tuning.systemInstruction.trim();
    const styleGuide = tuning.styleGuide.map((line) => `- ${line}`).join('\n');
    const safeguards = tuning.safetyClauses
      .map((line) => `- ${line}`)
      .join('\n');
    const contextEntries = Object.entries(parcel.ticket.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const promptSections = [
      `System Instruction:\n${instruction}`,
      styleGuide ? `Style Guide:\n${styleGuide}` : undefined,
      safeguards ? `Safeguards:\n${safeguards}` : undefined,
      contextEntries ? `Context:\n${contextEntries}` : undefined,
      `User Prompt:\n${parcel.ticket.prompt}`,
    ].filter(Boolean);

    return promptSections.join('\n\n');
  }
}

export const orchestrator = new LinearXOrchestrator();

export function createLinearXOrchestrator(
  spec: LinearXOrchestratorSpec = LINEARX_SPEC,
) {
  return new LinearXOrchestrator(spec);
}

// Zero Spend Routing exports
export { BudgetGuardian } from './budget.js';
export { DiscoveryEngine } from './discovery.js';
export { MetricsRecorder } from './metrics.js';
export { OptimizationManager } from './optimizations.js';
export { ValueDensityRouter } from './router.js';
export { ZeroSpendOrchestrator } from './orchestrator.js';

// ============================================================================
// CURSOR GOVERNANCE GATEWAY - Added from PR 1299
// ============================================================================

import { createServer, type IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import {
  type BudgetConfig,
  type BudgetState,
  type CursorEventName,
  type CursorEventPayload,
  type CursorGatewayRequest,
  type GatewayResponse,
  type RateLimitConfig,
  type RateLimitState,
  normalizeCursorEvent,
} from 'common-types';
import { PolicyEvaluator } from 'policy';

export interface GatewayLogger {
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CursorGatewayOptions {
  policyEvaluator: PolicyEvaluator;
  ledger: ProvenanceLedger;
  budgetManager: BudgetManager;
  rateLimiter: RateLimiter;
  scopeMapping?: Partial<Record<CursorEventName, string[]>>;
  requireDeviceBinding?: boolean;
  requireMtls?: boolean;
  logger?: GatewayLogger;
}

export class CursorGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ruleId?: string,
  ) {
    super(message);
  }
}

const DEFAULT_SCOPE_MAPPING: Record<CursorEventName, string[]> = {
  'cursor.session.start': ['read_repo'],
  'cursor.session.stop': ['read_repo'],
  'cursor.prompt': ['call_llm'],
  'cursor.applyDiff': ['generate_code'],
  'cursor.commit': ['generate_code', 'run_tool'],
};

export class CursorGateway {
  private readonly options: CursorGatewayOptions;

  constructor(options: CursorGatewayOptions) {
    this.options = options;
  }

  async handle(request: CursorGatewayRequest): Promise<GatewayResponse> {
    const now = request.now ?? new Date();
    const event = request.event;
    const auth = request.auth;

    this.validateTenant(event, auth);
    this.validateTokenExpiry(auth, now);
    if (this.options.requireDeviceBinding && !auth.deviceId) {
      throw new CursorGatewayError(
        'device-binding-required',
        401,
        'device-binding',
      );
    }
    if (this.options.requireMtls && !auth.mTLSFingerprint) {
      throw new CursorGatewayError('mtls-required', 401, 'mtls');
    }

    const requiredScopes = this.resolveScopes(event.event);
    const missingScopes = requiredScopes.filter(
      (scope) => !auth.scopes.includes(scope),
    );
    if (missingScopes.length > 0) {
      throw new CursorGatewayError(
        `missing-scopes:${missingScopes.join(',')}`,
        403,
        'scopes',
      );
    }

    const rateResult = this.options.rateLimiter.check(event, now.getTime());
    if (!rateResult.allowed) {
      const decision = this.buildDenyDecision(now, 'deny:rate-limit', event, [
        'rate-limit',
      ]);
      const budget = this.options.budgetManager.consume(
        auth.tenantId,
        event.usage,
        now,
        { commit: false },
      );
      const record = await this.options.ledger.append(event, {
        decision,
        budget,
        rateLimit: rateResult,
        receivedAt: now,
      });
      this.options.logger?.warn?.('cursor.rate-limit', {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
      });
      return { decision, budget, rateLimit: rateResult, record };
    }

    const budget = this.options.budgetManager.consume(
      auth.tenantId,
      event.usage,
      now,
    );
    if (!budget.allowed) {
      const decision = this.buildDenyDecision(
        now,
        budget.reason ?? 'deny:budget-exceeded',
        event,
        ['budget'],
      );
      const record = await this.options.ledger.append(event, {
        decision,
        budget,
        rateLimit: rateResult,
        receivedAt: now,
      });
      this.options.logger?.warn?.('cursor.budget-deny', {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        reason: budget.reason,
      });
      return { decision, budget, rateLimit: rateResult, record };
    }

    const policyDecision = this.options.policyEvaluator.evaluate(
      event,
      this.buildPolicyContext(event, auth),
    );

    const record = await this.options.ledger.append(event, {
      decision: policyDecision,
      budget,
      rateLimit: rateResult,
      receivedAt: now,
    });

    if (policyDecision.decision === 'deny') {
      this.options.logger?.warn?.('cursor.policy-deny', {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        explanations: policyDecision.explanations,
      });
    } else {
      this.options.logger?.info?.('cursor.event.accepted', {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        checksum: record.checksum,
      });
    }

    return { decision: policyDecision, budget, rateLimit: rateResult, record };
  }

  private resolveScopes(eventName: CursorEventName): string[] {
    const override = this.options.scopeMapping?.[eventName];
    if (override) {
      return override;
    }
    return DEFAULT_SCOPE_MAPPING[eventName] ?? [];
  }

  private validateTenant(event: CursorEvent, auth: GatewayAuthContext): void {
    if (event.tenantId !== auth.tenantId) {
      throw new CursorGatewayError('tenant-mismatch', 403, 'tenant');
    }
  }

  private validateTokenExpiry(auth: GatewayAuthContext, now: Date): void {
    const expires = Date.parse(auth.tokenExpiresAt);
    if (Number.isNaN(expires)) {
      throw new CursorGatewayError('token-expiry-invalid', 401, 'token');
    }
    if (expires <= now.getTime()) {
      throw new CursorGatewayError('token-expired', 401, 'token');
    }
  }

  private buildPolicyContext(event: CursorEvent, auth: GatewayAuthContext) {
    return {
      repoMeta: auth.repoMeta,
      scan: auth.scan,
      purpose: auth.purpose ?? event.purpose,
      dataClasses: auth.dataClasses,
      model: auth.model ?? event.model,
      story: auth.storyRef,
    };
  }

  private buildDenyDecision(
    now: Date,
    explanation: string,
    event: CursorEvent,
    ruleIds: string[],
  ): PolicyDecision {
    return {
      decision: 'deny',
      explanations: [explanation],
      ruleIds,
      timestamp: now.now().toISOString(),
      metadata: {
        tenantId: event.tenantId,
        repo: event.repo,
        event: event.event,
      },
    };
  }
}

export interface BudgetManagerOptions {
  budgets: Record<string, BudgetConfig>;
  defaultBudget?: BudgetConfig;
  now?: () => Date;
}

export class BudgetManager {
  private readonly budgets: Record<string, BudgetConfig>;
  private readonly defaultBudget?: BudgetConfig;
  private readonly now: () => Date;
  private readonly states = new Map<string, BudgetState>();

  constructor(options: BudgetManagerOptions) {
    this.budgets = options.budgets;
    this.defaultBudget = options.defaultBudget;
    this.now = options.now ?? (() => new Date());
  }

  consume(
    tenantId: string,
    usage: CursorEvent['usage'],
    at: Date = this.now(),
    opts: { commit?: boolean } = {},
  ): BudgetResult {
    const config = this.budgets[tenantId] ?? this.defaultBudget;
    const commit = opts.commit ?? true;

    if (!config) {
      return {
        allowed: true,
        reason: undefined,
        remainingTokens: Number.POSITIVE_INFINITY,
        remainingCurrency: undefined,
        alertTriggered: false,
        budget: null,
        state: {
          windowStartedAt: at.getTime(),
          tokensConsumed: 0,
          currencyConsumed: 0,
          lastEventAt: at.getTime(),
        },
      };
    }

    const state = this.resolveState(tenantId, config, at);
    const tokens = usage?.totalTokens ?? 0;
    const currency = usage?.costUsd ?? 0;

    const nextTokens = state.tokensConsumed + tokens;
    const nextCurrency = state.currencyConsumed + currency;

    const tokensAllowed = nextTokens <= config.tokens;
    const currencyAllowed =
      config.currency === undefined || nextCurrency <= config.currency;
    const allowed = tokensAllowed && currencyAllowed;

    const alertThreshold = config.alertPercent ?? 0.8;
    const tokenAlert = nextTokens >= config.tokens * alertThreshold;
    const currencyAlert =
      config.currency !== undefined &&
      nextCurrency >= config.currency * alertThreshold;

    if (allowed && commit) {
      state.tokensConsumed = nextTokens;
      state.currencyConsumed = nextCurrency;
    }
    state.lastEventAt = at.getTime();

    return {
      allowed,
      reason: allowed
        ? undefined
        : this.buildBudgetReason(tokensAllowed, currencyAllowed),
      remainingTokens: Math.max(config.tokens - nextTokens, 0),
      remainingCurrency:
        config.currency !== undefined
          ? Math.max(config.currency - nextCurrency, 0)
          : undefined,
      alertTriggered: tokenAlert || currencyAlert,
      budget: config,
      state: { ...state },
    };
  }

  private buildBudgetReason(
    tokensAllowed: boolean,
    currencyAllowed: boolean,
  ): string {
    if (!tokensAllowed && !currencyAllowed) {
      return 'deny:budget-tokens-currency';
    }
    if (!tokensAllowed) {
      return 'deny:budget-tokens';
    }
    if (!currencyAllowed) {
      return 'deny:budget-currency';
    }
    return 'deny:budget';
  }

  private resolveState(
    tenantId: string,
    config: BudgetConfig,
    at: Date,
  ): BudgetState {
    const existing = this.states.get(tenantId);
    if (!existing) {
      const initial: BudgetState = {
        windowStartedAt: at.getTime(),
        tokensConsumed: 0,
        currencyConsumed: 0,
        lastEventAt: at.getTime(),
      };
      this.states.set(tenantId, initial);
      return initial;
    }

    const windowExpired =
      at.getTime() - existing.windowStartedAt >= config.windowMs;
    if (windowExpired) {
      existing.windowStartedAt = at.getTime();
      existing.tokensConsumed = 0;
      existing.currencyConsumed = 0;
    }
    return existing;
  }
}

export interface RateLimiterOptions {
  config: RateLimitConfig;
  now?: () => number;
}

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly now: () => number;
  private readonly states = new Map<string, RateLimitState>();

  constructor(options: RateLimiterOptions) {
    this.config = options.config;
    this.now = options.now ?? (() => Date.now());
  }

  check(event: CursorEvent, timestamp: number = this.now()): RateLimitResult {
    const key = this.config.keyFactory
      ? this.config.keyFactory(event)
      : `${event.tenantId}:${event.actor.id}:${event.event}`;
    const state = this.states.get(key) ?? {
      tokens: this.config.capacity,
      updatedAt: timestamp,
    };

    const elapsedSeconds = (timestamp - state.updatedAt) / 1000;
    if (elapsedSeconds > 0) {
      const refill = elapsedSeconds * this.config.refillPerSecond;
      state.tokens = Math.min(this.config.capacity, state.tokens + refill);
      state.updatedAt = timestamp;
    }

    if (state.tokens < 1) {
      this.states.set(key, state);
      return {
        allowed: false,
        reason: 'rate-limit-exceeded',
        state: { ...state },
        config: this.config,
      };
    }

    state.tokens -= 1;
    this.states.set(key, state);

    return {
      allowed: true,
      state: { ...state },
      config: this.config,
    };
  }
}

export interface GatewayHttpOptions {
  gateway: CursorGateway;
  logger?: GatewayLogger;
}

export function createGatewayHttpServer(options: GatewayHttpOptions) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    if (req.method !== 'POST' || url.pathname !== '/v1/cursor/events') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not-found' }));
      return;
    }

    try {
      const payload = await readJson(req);
      const eventPayload = payload.event ?? payload;
      const event = normalizePayloadToEvent(eventPayload);
      const auth = buildAuthContext(payload.auth, req, event);
      const result = await options.gateway.handle({ event, auth });
      const status = result.decision.decision === 'allow' ? 202 : 403;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          decision: result.decision,
          budget: result.budget,
          rateLimit: result.rateLimit,
          checksum: result.record.checksum,
        }),
      );
    } catch (error) {
      if (error instanceof CursorGatewayError) {
        res.writeHead(error.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: error.message, ruleId: error.ruleId }));
        return;
      }

      options.logger?.error?.('cursor.gateway.error', {
        message: (error as Error).message,
      });
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal-error' }));
    }
  });

  return server;
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function normalizePayloadToEvent(payload: unknown): CursorEvent {
  if (isCursorEvent(payload)) {
    return payload;
  }
  if (isCursorEventPayload(payload)) {
    return normalizeCursorEvent(payload);
  }
  throw new CursorGatewayError('invalid-event-payload', 400, 'payload');
}

function isCursorEvent(value: unknown): value is CursorEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tenantId' in value &&
    'event' in value &&
    'provenance' in value
  );
}

function isCursorEventPayload(value: unknown): value is CursorEventPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tenant_id' in value &&
    'provenance' in value
  );
}

function buildAuthContext(
  payload: any,
  req: IncomingMessage,
  event: CursorEvent,
): GatewayAuthContext {
  const scopes = parseScopes(payload?.scopes ?? req.headers['x-mc-scopes']);
  const actor = payload?.actor ?? {
    id: payload?.actorId ?? req.headers['x-actor-id'] ?? event.actor.id,
    email:
      payload?.actorEmail ?? req.headers['x-actor-email'] ?? event.actor.email,
    displayName:
      payload?.actorDisplayName ??
      req.headers['x-actor-display-name'] ??
      event.actor.displayName,
  };

  return {
    tenantId: payload?.tenantId ?? event.tenantId,
    actor,
    deviceId:
      payload?.deviceId ?? (req.headers['x-device-id'] as string | undefined),
    scopes,
    tokenExpiresAt:
      payload?.tokenExpiresAt ??
      (req.headers['x-token-expiry'] as string) ??
      new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    mTLSFingerprint:
      payload?.mTLSFingerprint ??
      (req.headers['x-mtls-fingerprint'] as string | undefined),
    purpose: payload?.purpose,
    storyRef: payload?.storyRef ?? event.storyRef,
    attributes: payload?.attributes,
    dataClasses: payload?.dataClasses ?? event.dataClasses,
    repoMeta: payload?.repoMeta,
    scan: payload?.scan,
    model: payload?.model ?? event.model,
    requestIp: req.socket.remoteAddress ?? undefined,
    requestId:
      (req.headers['x-request-id'] as string | undefined) ?? payload?.requestId,
  };
}

function parseScopes(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
  return [];
}

// ============================================================================
// MULTI-LLM COOPERATION EXPORTS - From codex/harden-and-extend-prompt-engine-and-cooperation-fabric
// ============================================================================

export { TicketNormalizer, NormalizationOptions } from './normalization.js';
export { GraphQLCostAnalyzer, GraphQLRateLimiter } from './graphql-cost.js';
export {
  AcceptanceCriteriaSynthesizer,
  AcceptanceCriteriaVerifier,
} from './acceptanceCriteria.js';
export { PolicyTagger } from './policyTagger.js';
export {
  CapabilityRegistry,
  ResourceAdapter,
  GenerationInput,
  GenerationOutput,
} from './capabilityRegistry.js';
export { PolicyRouter } from './policyRouter.js';
export {
  ContextPlanner,
  InstructionCompiler,
  SelfRefineLoop,
  GuardedGenerator,
  GeneratorFn,
  CriticFn,
} from './promptOps.js';
export {
  CooperationOrchestrator,
  ExecutionResult,
} from './cooperation/orchestrator.js';
export { SemanticBraidCoordinator } from './cooperation/semanticBraid.js';
export { CounterfactualShadowingCoordinator } from './cooperation/counterfactualShadowing.js';
export { CausalChallengeGamesCoordinator } from './cooperation/causalChallengeGames.js';
export { CrossEntropySwapCoordinator } from './cooperation/crossEntropySwaps.js';
export { ProofOfUsefulWorkbookCoordinator } from './cooperation/proofOfUsefulWorkbook.js';
