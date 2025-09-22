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
  generateGraphQLSchemaSDL
} from "../../common-types/src/linearx";

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
  graphql
} from 'graphql';
import type {
  LedgerEntry,
  LedgerFactInput,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule,
  WorkOrderResult,
  WorkOrderSubmission,
  WorkcellAgentDefinition,
  WorkcellToolDefinition
} from '../../common-types/src/index.js';
import { PolicyEngine, buildDefaultPolicyEngine } from 'policy';
import { ProvenanceLedger } from 'prov-ledger';
import { WorkcellRuntime } from 'workcell-runtime';

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
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: parseJsonLiteral
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
    DENY: { value: 'deny' }
  }
});

const PolicyObligationType = new GraphQLObjectType({
  name: 'PolicyObligation',
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    configuration: { type: GraphQLJSON }
  }
});

const PolicyTraceType = new GraphQLObjectType({
  name: 'PolicyTrace',
  fields: {
    ruleId: { type: new GraphQLNonNull(GraphQLString) },
    matched: { type: new GraphQLNonNull(GraphQLBoolean) },
    reasons: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) }
  }
});

const PolicyEvaluationType = new GraphQLObjectType({
  name: 'PolicyEvaluation',
  fields: {
    allowed: { type: new GraphQLNonNull(GraphQLBoolean) },
    effect: { type: new GraphQLNonNull(PolicyEffectEnum) },
    matchedRules: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    },
    reasons: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    obligations: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PolicyObligationType)))
    },
    trace: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PolicyTraceType))) }
  }
});

const WorkTaskStatusEnum = new GraphQLEnumType({
  name: 'WorkTaskStatus',
  values: {
    SUCCESS: { value: 'success' },
    REJECTED: { value: 'rejected' },
    FAILED: { value: 'failed' }
  }
});

const WorkOrderStatusEnum = new GraphQLEnumType({
  name: 'WorkOrderStatus',
  values: {
    COMPLETED: { value: 'completed' },
    PARTIAL: { value: 'partial' },
    REJECTED: { value: 'rejected' }
  }
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
    previousHash: { type: GraphQLString }
  }
});

const PolicyRuleType = new GraphQLObjectType({
  name: 'PolicyRule',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    effect: { type: new GraphQLNonNull(PolicyEffectEnum) },
    actions: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    resources: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    tags: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) }
  }
});

const WorkTaskResultType = new GraphQLObjectType({
  name: 'WorkTaskResult',
  fields: {
    taskId: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(WorkTaskStatusEnum) },
    logs: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    output: { type: new GraphQLNonNull(GraphQLJSON) }
  }
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
    tasks: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(WorkTaskResultType))) },
    obligations: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PolicyObligationType)))
    },
    reasons: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) }
  }
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
    timestamp: { type: GraphQLString }
  }
});

const PolicyEvaluationInput = new GraphQLInputObjectType({
  name: 'PolicyEvaluationInput',
  fields: {
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    region: { type: GraphQLString },
    attributes: { type: GraphQLJSON }
  }
});

const WorkTaskInputType = new GraphQLInputObjectType({
  name: 'WorkTaskInput',
  fields: {
    taskId: { type: new GraphQLNonNull(GraphQLString) },
    tool: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLString) },
    payload: { type: new GraphQLNonNull(GraphQLJSON) },
    requiredAuthority: { type: GraphQLInt }
  }
});

const WorkOrderInputType = new GraphQLInputObjectType({
  name: 'WorkOrderInput',
  fields: {
    orderId: { type: new GraphQLNonNull(GraphQLString) },
    submittedBy: { type: new GraphQLNonNull(GraphQLString) },
    tenantId: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
    agentName: { type: new GraphQLNonNull(GraphQLString) },
    roles: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    region: { type: GraphQLString },
    attributes: { type: GraphQLJSON },
    metadata: { type: GraphQLJSON },
    tasks: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(WorkTaskInputType)))
    }
  }
});

function buildSchema(): GraphQLSchema {
  const queryType = new GraphQLObjectType({
    name: 'Query',
      fields: {
        ledgerEntries: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(LedgerEntryType))),
          args: {
            category: { type: GraphQLString },
            limit: { type: GraphQLInt }
          },
          resolve: (_source, args: { category?: string; limit?: number }, context: GatewayContext) =>
            context.ledger.list(args)
        },
        policyRules: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PolicyRuleType))),
          resolve: (_source, _args, context: GatewayContext): PolicyRule[] =>
            context.policy.getRules()
        },
        workOrders: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(WorkOrderResultType))),
          resolve: (_source, _args, context: GatewayContext): WorkOrderResult[] =>
            context.workcell.listOrders()
        }
      }
    });

  const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      appendLedgerEntry: {
        type: new GraphQLNonNull(LedgerEntryType),
        args: {
          input: { type: new GraphQLNonNull(LedgerEntryInput) }
        },
        resolve: (
          _source,
          args: { input: LedgerFactInput },
          context: GatewayContext
        ): LedgerEntry => context.ledger.append(args.input)
      },
        simulatePolicy: {
          type: new GraphQLNonNull(PolicyEvaluationType),
          args: {
            input: { type: new GraphQLNonNull(PolicyEvaluationInput) }
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
          context: GatewayContext
        ): PolicyEvaluationResult => {
          const request: PolicyEvaluationRequest = {
            action: args.input.action,
            resource: args.input.resource,
            context: {
              tenantId: args.input.tenantId,
              userId: args.input.userId,
              roles: args.input.roles,
              region: args.input.region,
              attributes: args.input.attributes
            }
            };
            return context.policy.evaluate(request);
          }
        },
        submitWorkOrder: {
          type: new GraphQLNonNull(WorkOrderResultType),
          args: {
            input: { type: new GraphQLNonNull(WorkOrderInputType) }
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
            context: GatewayContext
          ): Promise<WorkOrderResult> => {
            const submission: WorkOrderSubmission = {
              orderId: args.input.orderId,
              submittedBy: args.input.submittedBy,
              tenantId: args.input.tenantId,
              userId: args.input.userId,
              agentName: args.input.agentName,
              roles: args.input.roles,
              region: args.input.region,
              attributes: args.input.attributes as WorkOrderSubmission['attributes'],
              metadata: args.input.metadata as WorkOrderSubmission['metadata'],
              tasks: args.input.tasks.map(task => ({
                taskId: task.taskId,
                tool: task.tool,
                action: task.action,
                resource: task.resource,
                payload: task.payload as Record<string, unknown>,
                requiredAuthority: task.requiredAuthority ?? undefined
              }))
            };
            return context.workcell.submitOrder(submission);
          }
        }
      }
    });

  return new GraphQLSchema({ query: queryType, mutation: mutationType });
}

export interface GatewayWorkcellOptions {
  tools?: WorkcellToolDefinition[];
  agents?: WorkcellAgentDefinition[];
}

export interface GatewayOptions {
  rules?: PolicyRule[];
  seedEntries?: LedgerFactInput[];
  workcell?: GatewayWorkcellOptions;
}

export class GatewayRuntime {
  private readonly policy: PolicyEngine;
  private readonly ledger: ProvenanceLedger;
  private readonly schema: GraphQLSchema;
  private readonly workcell: WorkcellRuntime;

  constructor(options: GatewayOptions = {}) {
    this.policy = options.rules ? new PolicyEngine(options.rules) : buildDefaultPolicyEngine();
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
      agents: options.workcell?.agents
    });
    if (!options.workcell?.tools || options.workcell.tools.length === 0) {
      this.workcell.registerTool({
        name: 'analysis',
        minimumAuthority: 1,
        handler: (task, context) => ({
          message: `analysis completed for ${context.orderId}`,
          echo: task.payload
        })
      });
    }
    if (!options.workcell?.agents || options.workcell.agents.length === 0) {
      this.workcell.registerAgent({
        name: 'baseline-agent',
        authority: 2,
        allowedTools: ['analysis'],
        roles: ['developer']
      });
    }
    this.schema = buildSchema();
  }

  async execute(source: string, variableValues?: Record<string, unknown>) {
    return graphql({
      schema: this.schema,
      source,
      variableValues,
      contextValue: {
        policy: this.policy,
        ledger: this.ledger,
        workcell: this.workcell
      }
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

function capabilityScore(ticket: TicketDescriptor, worker: WorkerDescriptor): number {
  const required = new Set(ticket.requiredCapabilities.map((cap) => cap.toLowerCase()));
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

  selectProvider(tag: string, options: ProviderResolutionOptions = {}): ProviderSelectionResult {
    const provider = resolveProviderForTag(tag, options, this.spec);
    const route = this.spec.providerRouting.find((candidate) => candidate.tags.includes(tag));
    const usedFallback = route ? provider !== route.primary : provider !== this.spec.fallbackChain[0];
    return {
      tag,
      provider,
      usedFallback,
      route
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
      reason: selection.usedFallback ? "fallback" : "primary"
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
    return listCommandPaletteIntents(id) as LinearXCommandPaletteIntent | undefined;
  }

  getCommandPaletteCategories(): LinearXCommandPaletteCategory[] {
    return listCommandPaletteCategories() as LinearXCommandPaletteCategory[];
  }

  getCommandPaletteCategory(id: string): LinearXCommandPaletteCategory | undefined {
    return listCommandPaletteCategories(id) as LinearXCommandPaletteCategory | undefined;
  }

  getCommandPaletteManifest(): LinearXCommandPaletteManifest {
    return buildCommandPaletteManifest();
  }

  getBoardEnhancements(): LinearXBoardEnhancement[] {
    return listBoardEnhancements() as LinearXBoardEnhancement[];
  }

  getBoardEnhancement(feature: string): LinearXBoardEnhancement | undefined {
    return listBoardEnhancements(feature) as LinearXBoardEnhancement | undefined;
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
      ? this.getKeyboardShortcuts().filter((shortcut) => shortcut.action === binding.keyboardShortcutAction)
      : [];
    const relatedIntents = binding.commandPaletteIntentId
      ? this.getCommandPaletteIntents().filter((intent) => intent.id === binding.commandPaletteIntentId)
      : [];
    const resolverSignature = `${binding.operation === "Mutation" ? "extend type Mutation" : "extend type Query"} { ${binding.field}(input: ${binding.inputType}) : ${binding.returnType} }`;
    return {
      binding,
      invocation,
      resolverSignature,
      guardrails: [...binding.guardrails],
      relatedShortcuts,
      relatedIntents
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
      commandPaletteManifest: this.getCommandPaletteManifest()
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
      graphqlBindings: this.getGraphQLBindings()
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
      const overridden = eligibleWorkers.find((entry) => entry.worker.id === overrideWorkerId);
      if (overridden) {
        selection = overridden;
      }
    } else {
      selection = eligibleWorkers
        .slice()
        .sort((a, b) => {
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
    const manualMultiplier = ticket.automationMode === 'manual' ? 2 : ticket.automationMode === 'guided' ? 1.3 : 1;
    return Math.ceil((base + priorityAdjustment) * manualMultiplier);
  }
}

export class AutomationCommandBuilder {
  constructor(private readonly allocator: WorkloadAllocator) {}

  public createCommands(tickets: readonly TicketDescriptor[]): AutomationCommand[] {
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
    const safeguards = tuning.safetyClauses.map((line) => `- ${line}`).join('\n');
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

export function createLinearXOrchestrator(spec: LinearXOrchestratorSpec = LINEARX_SPEC) {
  return new LinearXOrchestrator(spec);
}

// Zero Spend Routing exports
export { BudgetGuardian } from './budget.js';
export { DiscoveryEngine } from './discovery.js';
export { MetricsRecorder } from './metrics.js';
export { OptimizationManager } from './optimizations.js';
export { ValueDensityRouter } from './router.js';
export { ZeroSpendOrchestrator } from './orchestrator.js';
