"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeServices = exports.FederatedGateway = exports.ProofOfUsefulWorkbookCoordinator = exports.CrossEntropySwapCoordinator = exports.CausalChallengeGamesCoordinator = exports.CounterfactualShadowingCoordinator = exports.SemanticBraidCoordinator = exports.CooperationOrchestrator = exports.GuardedGenerator = exports.SelfRefineLoop = exports.InstructionCompiler = exports.ContextPlanner = exports.PolicyRouter = exports.CapabilityRegistry = exports.PolicyTagger = exports.AcceptanceCriteriaVerifier = exports.AcceptanceCriteriaSynthesizer = exports.GraphQLRateLimiter = exports.GraphQLCostAnalyzer = exports.TicketNormalizer = exports.RateLimiter = exports.BudgetManager = exports.CursorGateway = exports.CursorGatewayError = exports.ZeroSpendOrchestrator = exports.ValueDensityRouter = exports.OptimizationManager = exports.MetricsRecorder = exports.DiscoveryEngine = exports.BudgetGuardian = exports.orchestrator = exports.AutomationCommandBuilder = exports.WorkloadAllocator = exports.LinearXOrchestrator = exports.GatewayRuntime = void 0;
exports.createLinearXOrchestrator = createLinearXOrchestrator;
exports.createGatewayHttpServer = createGatewayHttpServer;
const node_crypto_1 = require("node:crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
// ============================================================================
// GraphQL Gateway - From HEAD
// ============================================================================
// LinearX Orchestration System
const linearx_1 = require("../../common-types/src/linearx");
const graphql_1 = require("graphql");
const policy_1 = require("policy");
const prov_ledger_1 = require("prov-ledger");
const workcell_runtime_1 = require("workcell-runtime");
const graphql_cost_js_1 = require("./graphql-cost.js");
function parseJsonLiteral(ast) {
    switch (ast.kind) {
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.BOOLEAN:
            return ast.value;
        case graphql_1.Kind.INT:
            return Number.parseInt(ast.value, 10);
        case graphql_1.Kind.FLOAT:
            return Number.parseFloat(ast.value);
        case graphql_1.Kind.OBJECT: {
            const value = {};
            for (const field of ast.fields) {
                value[field.name.value] = parseJsonLiteral(field.value);
            }
            return value;
        }
        case graphql_1.Kind.LIST:
            return ast.values.map(parseJsonLiteral);
        case graphql_1.Kind.NULL:
            return null;
        default:
            return null;
    }
}
const GraphQLJSON = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: parseJsonLiteral,
});
const GraphNodeType = new graphql_1.GraphQLObjectType({
    name: 'GraphNode',
    fields: {
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        data: { type: new graphql_1.GraphQLNonNull(GraphQLJSON) },
    },
});
const ServiceContextType = new graphql_1.GraphQLObjectType({
    name: 'ServiceContext',
    fields: {
        service: { type: GraphQLJSON },
        environments: { type: new graphql_1.GraphQLList(GraphQLJSON) },
        incidents: { type: new graphql_1.GraphQLList(GraphQLJSON) },
        policies: { type: new graphql_1.GraphQLList(GraphQLJSON) },
        pipelines: { type: new graphql_1.GraphQLList(GraphQLJSON) },
        risk: { type: GraphQLJSON },
    },
});
class SimpleDataLoader {
    batchLoadFn;
    cache = new Map();
    pending = [];
    callbacks = new Map();
    scheduled = false;
    constructor(batchLoadFn) {
        this.batchLoadFn = batchLoadFn;
    }
    load(key) {
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }
        const promise = new Promise((resolve, reject) => {
            this.pending.push(key);
            const callbacks = this.callbacks.get(key) ?? [];
            callbacks.push({ resolve, reject });
            this.callbacks.set(key, callbacks);
            if (!this.scheduled) {
                this.scheduled = true;
                queueMicrotask(() => this.dispatch());
            }
        });
        this.cache.set(key, promise);
        return promise;
    }
    async loadMany(keys) {
        return Promise.all(keys.map((key) => this.load(key)));
    }
    async dispatch() {
        this.scheduled = false;
        const keys = Array.from(new Set(this.pending));
        this.pending = [];
        try {
            const values = await this.batchLoadFn(keys);
            keys.forEach((key, index) => {
                const callbacks = this.callbacks.get(key) ?? [];
                const value = values[index];
                callbacks.forEach(({ resolve }) => resolve(value));
                this.cache.set(key, Promise.resolve(value));
                this.callbacks.delete(key);
            });
        }
        catch (error) {
            keys.forEach((key) => {
                const callbacks = this.callbacks.get(key) ?? [];
                callbacks.forEach(({ reject }) => reject(error));
            });
        }
    }
}
const PolicyEffectEnum = new graphql_1.GraphQLEnumType({
    name: 'PolicyEffect',
    values: {
        ALLOW: { value: 'allow' },
        DENY: { value: 'deny' },
    },
});
const PolicyObligationType = new graphql_1.GraphQLObjectType({
    name: 'PolicyObligation',
    fields: {
        type: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        configuration: { type: GraphQLJSON },
    },
});
const PolicyTraceType = new graphql_1.GraphQLObjectType({
    name: 'PolicyTrace',
    fields: {
        ruleId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        matched: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        reasons: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
    },
});
const PolicyEvaluationType = new graphql_1.GraphQLObjectType({
    name: 'PolicyEvaluation',
    fields: {
        allowed: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean) },
        effect: { type: new graphql_1.GraphQLNonNull(PolicyEffectEnum) },
        matchedRules: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        reasons: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        obligations: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(PolicyObligationType))),
        },
        trace: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(PolicyTraceType))),
        },
    },
});
const WorkTaskStatusEnum = new graphql_1.GraphQLEnumType({
    name: 'WorkTaskStatus',
    values: {
        SUCCESS: { value: 'success' },
        REJECTED: { value: 'rejected' },
        FAILED: { value: 'failed' },
    },
});
const WorkOrderStatusEnum = new graphql_1.GraphQLEnumType({
    name: 'WorkOrderStatus',
    values: {
        COMPLETED: { value: 'completed' },
        PARTIAL: { value: 'partial' },
        REJECTED: { value: 'rejected' },
    },
});
const LedgerEntryType = new graphql_1.GraphQLObjectType({
    name: 'LedgerEntry',
    fields: {
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        category: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        actor: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        action: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        resource: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        payload: { type: new graphql_1.GraphQLNonNull(GraphQLJSON) },
        timestamp: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        hash: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        previousHash: { type: graphql_1.GraphQLString },
    },
});
const PolicyRuleType = new graphql_1.GraphQLObjectType({
    name: 'PolicyRule',
    fields: {
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        description: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        effect: { type: new graphql_1.GraphQLNonNull(PolicyEffectEnum) },
        actions: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        resources: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        tags: { type: new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString)) },
    },
});
const WorkTaskResultType = new graphql_1.GraphQLObjectType({
    name: 'WorkTaskResult',
    fields: {
        taskId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        status: { type: new graphql_1.GraphQLNonNull(WorkTaskStatusEnum) },
        logs: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        output: { type: new graphql_1.GraphQLNonNull(GraphQLJSON) },
    },
});
const WorkOrderResultType = new graphql_1.GraphQLObjectType({
    name: 'WorkOrderResult',
    fields: {
        orderId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        submittedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        agentName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        tenantId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        status: { type: new graphql_1.GraphQLNonNull(WorkOrderStatusEnum) },
        startedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        finishedAt: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        tasks: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(WorkTaskResultType))),
        },
        obligations: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(PolicyObligationType))),
        },
        reasons: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
    },
});
const LedgerEntryInput = new graphql_1.GraphQLInputObjectType({
    name: 'LedgerEntryInput',
    fields: {
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        category: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        actor: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        action: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        resource: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        payload: { type: new graphql_1.GraphQLNonNull(GraphQLJSON) },
        timestamp: { type: graphql_1.GraphQLString },
    },
});
const PolicyEvaluationInput = new graphql_1.GraphQLInputObjectType({
    name: 'PolicyEvaluationInput',
    fields: {
        action: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        resource: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        tenantId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        roles: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        region: { type: graphql_1.GraphQLString },
        attributes: { type: GraphQLJSON },
    },
});
const WorkTaskInputType = new graphql_1.GraphQLInputObjectType({
    name: 'WorkTaskInput',
    fields: {
        taskId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        tool: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        action: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        resource: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        payload: { type: new graphql_1.GraphQLNonNull(GraphQLJSON) },
        requiredAuthority: { type: graphql_1.GraphQLInt },
    },
});
const WorkOrderInputType = new graphql_1.GraphQLInputObjectType({
    name: 'WorkOrderInput',
    fields: {
        orderId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        submittedBy: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        tenantId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        userId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        agentName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        roles: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLString))),
        },
        region: { type: graphql_1.GraphQLString },
        attributes: { type: GraphQLJSON },
        metadata: { type: GraphQLJSON },
        tasks: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(WorkTaskInputType))),
        },
    },
});
function buildSchema() {
    const queryType = new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: {
            ledgerEntries: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(LedgerEntryType))),
                args: {
                    category: { type: graphql_1.GraphQLString },
                    limit: { type: graphql_1.GraphQLInt },
                },
                resolve: (_source, args, context) => context.ledger.list(args),
            },
            policyRules: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(PolicyRuleType))),
                resolve: (_source, _args, context) => context.policy.getRules(),
            },
            workOrders: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(WorkOrderResultType))),
                resolve: (_source, _args, context) => context.workcell.listOrders(),
            },
            graphNode: {
                type: GraphNodeType,
                args: { id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) } },
                resolve: async (_source, args, context) => {
                    if (!context.loaders?.nodeLoader) {
                        throw new graphql_1.GraphQLError('KNOWLEDGE_GRAPH_NOT_CONFIGURED', {
                            extensions: { code: 'KNOWLEDGE_GRAPH_NOT_CONFIGURED' },
                        });
                    }
                    return (await context.loaders.nodeLoader.load(args.id)) ?? null;
                },
            },
            graphNodes: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(GraphNodeType))),
                args: {
                    ids: {
                        type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLID))),
                    },
                },
                resolve: async (_source, args, context) => {
                    if (!context.loaders?.nodeLoader) {
                        throw new graphql_1.GraphQLError('KNOWLEDGE_GRAPH_NOT_CONFIGURED', {
                            extensions: { code: 'KNOWLEDGE_GRAPH_NOT_CONFIGURED' },
                        });
                    }
                    const nodes = await context.loaders.nodeLoader.loadMany(args.ids);
                    return nodes.filter((node) => node !== null);
                },
            },
            serviceContext: {
                type: ServiceContextType,
                args: { serviceId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) } },
                resolve: (_source, args, context) => {
                    if (!context.knowledgeGraph) {
                        throw new graphql_1.GraphQLError('KNOWLEDGE_GRAPH_NOT_CONFIGURED', {
                            extensions: { code: 'KNOWLEDGE_GRAPH_NOT_CONFIGURED' },
                        });
                    }
                    return context.knowledgeGraph.queryService?.(args.serviceId) ?? null;
                },
            },
        },
    });
    const mutationType = new graphql_1.GraphQLObjectType({
        name: 'Mutation',
        fields: {
            appendLedgerEntry: {
                type: new graphql_1.GraphQLNonNull(LedgerEntryType),
                args: {
                    input: { type: new graphql_1.GraphQLNonNull(LedgerEntryInput) },
                },
                resolve: (_source, args, context) => context.ledger.append(args.input),
            },
            simulatePolicy: {
                type: new graphql_1.GraphQLNonNull(PolicyEvaluationType),
                args: {
                    input: { type: new graphql_1.GraphQLNonNull(PolicyEvaluationInput) },
                },
                resolve: (_source, args, context) => {
                    const request = {
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
                type: new graphql_1.GraphQLNonNull(WorkOrderResultType),
                args: {
                    input: { type: new graphql_1.GraphQLNonNull(WorkOrderInputType) },
                },
                resolve: async (_source, args, context) => {
                    const submission = {
                        orderId: args.input.orderId,
                        submittedBy: args.input.submittedBy,
                        tenantId: args.input.tenantId,
                        userId: args.input.userId,
                        agentName: args.input.agentName,
                        roles: args.input.roles,
                        region: args.input.region,
                        attributes: args.input
                            .attributes,
                        metadata: args.input.metadata,
                        tasks: args.input.tasks.map((task) => ({
                            taskId: task.taskId,
                            tool: task.tool,
                            action: task.action,
                            resource: task.resource,
                            payload: task.payload,
                            requiredAuthority: task.requiredAuthority ?? undefined,
                        })),
                    };
                    return context.workcell.submitOrder(submission);
                },
            },
        },
    });
    return new graphql_1.GraphQLSchema({ query: queryType, mutation: mutationType });
}
class GatewayRuntime {
    policy;
    ledger;
    schema;
    workcell;
    costGuardOptions;
    rateLimiter;
    defaultTenantId;
    knowledgeGraphOptions;
    cacheClient;
    cacheTtlSeconds;
    auditOptions;
    auditLog;
    auditSystem;
    auditEnabled;
    constructor(options = {}) {
        this.policy = options.rules
            ? new policy_1.PolicyEngine(options.rules)
            : (0, policy_1.buildDefaultPolicyEngine)();
        this.ledger = new prov_ledger_1.ProvenanceLedger();
        if (options.seedEntries) {
            for (const entry of options.seedEntries) {
                this.ledger.append(entry);
            }
        }
        this.workcell = new workcell_runtime_1.WorkcellRuntime({
            policy: this.policy,
            ledger: this.ledger,
            tools: options.workcell?.tools,
            agents: options.workcell?.agents,
        });
        this.costGuardOptions = options.costGuard;
        this.defaultTenantId = this.costGuardOptions?.defaultTenantId ?? 'public';
        this.knowledgeGraphOptions = options.knowledgeGraph;
        this.cacheClient = this.knowledgeGraphOptions?.cacheClient;
        this.cacheTtlSeconds = this.knowledgeGraphOptions?.cacheTtlSeconds ?? 300;
        this.auditOptions = options.audit;
        this.auditEnabled = this.auditOptions?.enabled !== false;
        this.auditLog = this.auditEnabled
            ? this.auditOptions?.log ?? new prov_ledger_1.AppendOnlyAuditLog()
            : undefined;
        this.auditSystem = this.auditOptions?.system ?? 'intelgraph-gateway';
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
            const { enabled: _enabled, defaultTenantId: _defaultTenantId, ...rateLimiterOptions } = this.costGuardOptions ?? {};
            this.rateLimiter = new graphql_cost_js_1.GraphQLRateLimiter(this.schema, rateLimiterOptions);
        }
    }
    buildKnowledgeGraphLoaders() {
        const knowledgeGraph = this.knowledgeGraphOptions?.knowledgeGraph;
        if (!knowledgeGraph) {
            return undefined;
        }
        const cache = this.cacheClient;
        const ttl = this.cacheTtlSeconds;
        const cacheKey = (id) => `kg:node:${id}`;
        const nodeLoader = new SimpleDataLoader(async (ids) => {
            const cachedResults = await Promise.all(ids.map(async (id) => {
                if (!cache) {
                    return null;
                }
                const cached = await cache.get(cacheKey(id));
                if (!cached) {
                    return null;
                }
                try {
                    return JSON.parse(cached);
                }
                catch {
                    return null;
                }
            }));
            const results = [];
            const missingIds = [];
            cachedResults.forEach((node, index) => {
                if (node) {
                    results[index] = node;
                }
                else {
                    results[index] = null;
                    missingIds.push(ids[index]);
                }
            });
            if (missingIds.length > 0) {
                const fetched = await Promise.all(missingIds.map((id) => Promise.resolve(knowledgeGraph.getNode(id)).then((node) => node ?? null)));
                let fetchIndex = 0;
                for (let i = 0; i < results.length; i += 1) {
                    if (results[i] === null) {
                        const node = fetched[fetchIndex] ?? null;
                        results[i] = node;
                        if (node && cache) {
                            void cache.setEx(cacheKey(ids[i]), ttl, JSON.stringify(node));
                        }
                        fetchIndex += 1;
                    }
                }
            }
            return results;
        });
        return { nodeLoader };
    }
    async execute(source, variableValues, options) {
        const tenantId = options?.tenantId ?? this.defaultTenantId;
        const actorId = options?.actorId ?? tenantId;
        const loaders = this.buildKnowledgeGraphLoaders();
        const guard = this.rateLimiter;
        if (guard) {
            const evaluation = guard.beginExecution(source, tenantId);
            if (evaluation.decision.action === 'kill' || evaluation.decision.action === 'throttle') {
                const blockedResult = {
                    data: null,
                    errors: [
                        new graphql_1.GraphQLError(evaluation.decision.reason, {
                            extensions: {
                                code: evaluation.decision.action === 'kill'
                                    ? 'COST_GUARD_KILL'
                                    : 'COST_GUARD_THROTTLE',
                                retryAfterMs: evaluation.decision.nextCheckMs,
                                metrics: evaluation.decision.metrics,
                                plan: evaluation.plan,
                            },
                        }),
                    ],
                };
                this.appendAuditEvent({
                    source,
                    tenantId,
                    actorId,
                    decision: evaluation.decision,
                    errors: blockedResult.errors,
                    durationMs: 0,
                });
                return blockedResult;
            }
            const startedAt = node_perf_hooks_1.performance.now();
            try {
                const result = await (0, graphql_1.graphql)({
                    schema: this.schema,
                    source,
                    variableValues,
                    contextValue: {
                        policy: this.policy,
                        ledger: this.ledger,
                        workcell: this.workcell,
                        knowledgeGraph: this.knowledgeGraphOptions?.knowledgeGraph,
                        loaders,
                    },
                });
                this.appendAuditEvent({
                    source,
                    tenantId,
                    actorId,
                    decision: evaluation.decision,
                    errors: result.errors,
                    durationMs: node_perf_hooks_1.performance.now() - startedAt,
                });
                return result;
            }
            finally {
                evaluation.release?.(node_perf_hooks_1.performance.now() - startedAt);
            }
        }
        const startedAt = node_perf_hooks_1.performance.now();
        const result = await (0, graphql_1.graphql)({
            schema: this.schema,
            source,
            variableValues,
            contextValue: {
                policy: this.policy,
                ledger: this.ledger,
                workcell: this.workcell,
                knowledgeGraph: this.knowledgeGraphOptions?.knowledgeGraph,
                loaders,
            },
        });
        this.appendAuditEvent({
            source,
            tenantId,
            actorId,
            errors: result.errors,
            durationMs: node_perf_hooks_1.performance.now() - startedAt,
        });
        return result;
    }
    appendAuditEvent(params) {
        if (!this.auditLog || !this.auditEnabled) {
            return;
        }
        const severity = params.errors?.length
            ? 'high'
            : params.decision?.action === 'throttle'
                ? 'medium'
                : 'info';
        const action = params.decision && params.decision.action !== 'allow'
            ? `graphql.${params.decision.action}`
            : 'graphql.execute';
        this.auditLog.append({
            id: (0, node_crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            actor: params.actorId,
            action,
            resource: 'intelgraph.gateway.graphql',
            system: this.auditSystem,
            category: 'access',
            severity,
            metadata: {
                tenantId: params.tenantId,
                actorId: params.actorId,
                rateLimit: params.decision?.action ?? 'allow',
                reason: params.decision?.reason,
                decisionMetrics: params.decision?.metrics,
                durationMs: params.durationMs,
                operationHash: (0, node_crypto_1.createHash)('sha256').update(params.source).digest('hex'),
            },
        });
    }
    getSchema() {
        return this.schema;
    }
}
exports.GatewayRuntime = GatewayRuntime;
const DEFAULT_GUIDED_PLAN = {
    mode: 'guided',
    pauseBeforeNavigation: false,
    pauseBeforePrompt: true,
    pauseBeforeCapture: true,
};
const DEFAULT_MANUAL_PLAN = {
    mode: 'manual',
    pauseBeforeNavigation: true,
    pauseBeforePrompt: true,
    pauseBeforeCapture: true,
};
const DEFAULT_AUTOMATION_PLAN = {
    mode: 'auto',
    pauseBeforeNavigation: false,
    pauseBeforePrompt: false,
    pauseBeforeCapture: false,
};
function capabilityScore(ticket, worker) {
    const required = new Set(ticket.requiredCapabilities.map((cap) => cap.toLowerCase()));
    return worker.capabilities.reduce((score, capability) => {
        if (required.has(capability.skill.toLowerCase())) {
            return score + capability.weight;
        }
        return score;
    }, 0);
}
function automationPlanFor(mode) {
    switch (mode) {
        case 'manual':
            return DEFAULT_MANUAL_PLAN;
        case 'guided':
            return DEFAULT_GUIDED_PLAN;
        default:
            return DEFAULT_AUTOMATION_PLAN;
    }
}
class LinearXOrchestrator {
    spec;
    constructor(spec = linearx_1.LINEARX_SPEC) {
        this.spec = spec;
    }
    getSystemPrompt() {
        return this.spec.systemPrompt;
    }
    getQualityGates() {
        return { ...this.spec.qualityGates };
    }
    getFallbackChain() {
        return [...this.spec.fallbackChain];
    }
    selectProvider(tag, options = {}) {
        const provider = (0, linearx_1.resolveProviderForTag)(tag, options, this.spec);
        const route = this.spec.providerRouting.find((candidate) => candidate.tags.includes(tag));
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
    explainProvider(tag, options = {}) {
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
    listProviderRoutes() {
        return [...this.spec.providerRouting];
    }
    listToolContracts() {
        return (0, linearx_1.listToolContract)();
    }
    getToolContract(name) {
        return (0, linearx_1.listToolContract)(name);
    }
    getQuickNextSteps() {
        return [...this.spec.quickNextSteps];
    }
    getQuickStartChecklist() {
        return (0, linearx_1.summarizeQuickStart)();
    }
    getShortAnswers() {
        return [...this.spec.shortAnswers];
    }
    answerShortQuestion(question) {
        return (0, linearx_1.answerShortQuestion)(question);
    }
    getKeyboardShortcuts() {
        return (0, linearx_1.listKeyboardShortcuts)();
    }
    getKeyboardShortcut(action) {
        return (0, linearx_1.listKeyboardShortcuts)(action);
    }
    getCommandPaletteIntents() {
        return (0, linearx_1.listCommandPaletteIntents)();
    }
    getCommandPaletteIntent(id) {
        return (0, linearx_1.listCommandPaletteIntents)(id);
    }
    getCommandPaletteCategories() {
        return (0, linearx_1.listCommandPaletteCategories)();
    }
    getCommandPaletteCategory(id) {
        return (0, linearx_1.listCommandPaletteCategories)(id);
    }
    getCommandPaletteManifest() {
        return (0, linearx_1.buildCommandPaletteManifest)();
    }
    getBoardEnhancements() {
        return (0, linearx_1.listBoardEnhancements)();
    }
    getBoardEnhancement(feature) {
        return (0, linearx_1.listBoardEnhancements)(feature);
    }
    getGraphQLBindings() {
        return (0, linearx_1.listGraphQLBindings)();
    }
    getGraphQLBinding(field) {
        return (0, linearx_1.listGraphQLBindings)(field);
    }
    getGraphQLSchemaSDL() {
        return (0, linearx_1.generateGraphQLSchemaSDL)();
    }
    getKeyboardShortcutMap() {
        return (0, linearx_1.buildKeyboardShortcutMap)();
    }
    planGraphQLResolver(field) {
        const binding = this.getGraphQLBinding(field);
        if (!binding) {
            return undefined;
        }
        const invocation = (0, linearx_1.planGuardedInvocationForBinding)(binding);
        if (!invocation) {
            return undefined;
        }
        const relatedShortcuts = binding.keyboardShortcutAction
            ? this.getKeyboardShortcuts().filter((shortcut) => shortcut.action === binding.keyboardShortcutAction)
            : [];
        const relatedIntents = binding.commandPaletteIntentId
            ? this.getCommandPaletteIntents().filter((intent) => intent.id === binding.commandPaletteIntentId)
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
    buildIntegrationBlueprint() {
        const resolverPlans = this.getGraphQLBindings()
            .map((binding) => this.planGraphQLResolver(binding.field))
            .filter((plan) => Boolean(plan));
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
    describe() {
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
exports.LinearXOrchestrator = LinearXOrchestrator;
class WorkloadAllocator {
    workers;
    overrides = new Map();
    constructor(workers) {
        this.workers = workers;
        if (!workers.length) {
            throw new Error('WorkloadAllocator requires at least one worker profile');
        }
    }
    registerOverrides(overrides) {
        overrides.forEach((override) => {
            this.overrides.set(override.ticketId, override.workerId);
        });
    }
    plan(tickets) {
        const parcels = [];
        const unassigned = [];
        const mutableWorkers = this.workers.map((worker) => ({ ...worker }));
        tickets
            .slice()
            .sort((a, b) => b.priority - a.priority)
            .forEach((ticket) => {
            const parcel = this.planTicket(ticket, mutableWorkers);
            if (parcel) {
                parcels.push(parcel);
            }
            else {
                unassigned.push(ticket);
            }
        });
        return { parcels, unassigned };
    }
    planTicket(ticket, workers) {
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
        }
        else {
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
    estimateEffort(ticket) {
        const base = 30;
        const priorityAdjustment = Math.max(0, ticket.priority - 1) * 5;
        const manualMultiplier = ticket.automationMode === 'manual'
            ? 2
            : ticket.automationMode === 'guided'
                ? 1.3
                : 1;
        return Math.ceil((base + priorityAdjustment) * manualMultiplier);
    }
}
exports.WorkloadAllocator = WorkloadAllocator;
class AutomationCommandBuilder {
    allocator;
    constructor(allocator) {
        this.allocator = allocator;
    }
    createCommands(tickets) {
        const plan = this.allocator.plan(tickets);
        return plan.parcels.map((parcel) => this.createCommand(parcel));
    }
    createCommand(parcel) {
        const composedPrompt = this.composePrompt(parcel);
        const metadata = {
            manualControl: parcel.manualControl,
            workerId: parcel.worker.id,
            ticketId: parcel.ticket.id,
            entryUrl: parcel.ticket.entryUrl,
        };
        return { parcel, composedPrompt, metadata };
    }
    composePrompt(parcel) {
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
exports.AutomationCommandBuilder = AutomationCommandBuilder;
exports.orchestrator = new LinearXOrchestrator();
function createLinearXOrchestrator(spec = linearx_1.LINEARX_SPEC) {
    return new LinearXOrchestrator(spec);
}
// Zero Spend Routing exports
var budget_js_1 = require("./budget.js");
Object.defineProperty(exports, "BudgetGuardian", { enumerable: true, get: function () { return budget_js_1.BudgetGuardian; } });
var discovery_js_1 = require("./discovery.js");
Object.defineProperty(exports, "DiscoveryEngine", { enumerable: true, get: function () { return discovery_js_1.DiscoveryEngine; } });
var metrics_js_1 = require("./metrics.js");
Object.defineProperty(exports, "MetricsRecorder", { enumerable: true, get: function () { return metrics_js_1.MetricsRecorder; } });
var optimizations_js_1 = require("./optimizations.js");
Object.defineProperty(exports, "OptimizationManager", { enumerable: true, get: function () { return optimizations_js_1.OptimizationManager; } });
var router_js_1 = require("./router.js");
Object.defineProperty(exports, "ValueDensityRouter", { enumerable: true, get: function () { return router_js_1.ValueDensityRouter; } });
var orchestrator_js_1 = require("./orchestrator.js");
Object.defineProperty(exports, "ZeroSpendOrchestrator", { enumerable: true, get: function () { return orchestrator_js_1.ZeroSpendOrchestrator; } });
// ============================================================================
// CURSOR GOVERNANCE GATEWAY - Added from PR 1299
// ============================================================================
const node_http_1 = require("node:http");
const node_url_1 = require("node:url");
const common_types_1 = require("common-types");
class CursorGatewayError extends Error {
    status;
    ruleId;
    constructor(message, status, ruleId) {
        super(message);
        this.status = status;
        this.ruleId = ruleId;
    }
}
exports.CursorGatewayError = CursorGatewayError;
const DEFAULT_SCOPE_MAPPING = {
    'cursor.session.start': ['read_repo'],
    'cursor.session.stop': ['read_repo'],
    'cursor.prompt': ['call_llm'],
    'cursor.applyDiff': ['generate_code'],
    'cursor.commit': ['generate_code', 'run_tool'],
};
class CursorGateway {
    options;
    constructor(options) {
        this.options = options;
    }
    async handle(request) {
        const now = request.now ?? new Date();
        const event = request.event;
        const auth = request.auth;
        this.validateTenant(event, auth);
        this.validateTokenExpiry(auth, now);
        if (this.options.requireDeviceBinding && !auth.deviceId) {
            throw new CursorGatewayError('device-binding-required', 401, 'device-binding');
        }
        if (this.options.requireMtls && !auth.mTLSFingerprint) {
            throw new CursorGatewayError('mtls-required', 401, 'mtls');
        }
        const requiredScopes = this.resolveScopes(event.event);
        const missingScopes = requiredScopes.filter((scope) => !auth.scopes.includes(scope));
        if (missingScopes.length > 0) {
            throw new CursorGatewayError(`missing-scopes:${missingScopes.join(',')}`, 403, 'scopes');
        }
        const rateResult = this.options.rateLimiter.check(event, now.getTime());
        if (!rateResult.allowed) {
            const decision = this.buildDenyDecision(now, 'deny:rate-limit', event, [
                'rate-limit',
            ]);
            const budget = this.options.budgetManager.consume(auth.tenantId, event.usage, now, { commit: false });
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
        const budget = this.options.budgetManager.consume(auth.tenantId, event.usage, now);
        if (!budget.allowed) {
            const decision = this.buildDenyDecision(now, budget.reason ?? 'deny:budget-exceeded', event, ['budget']);
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
        const policyDecision = this.options.policyEvaluator.evaluate(event, this.buildPolicyContext(event, auth));
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
        }
        else {
            this.options.logger?.info?.('cursor.event.accepted', {
                tenantId: event.tenantId,
                requestId: event.provenance.requestId,
                checksum: record.checksum,
            });
        }
        return { decision: policyDecision, budget, rateLimit: rateResult, record };
    }
    resolveScopes(eventName) {
        const override = this.options.scopeMapping?.[eventName];
        if (override) {
            return override;
        }
        return DEFAULT_SCOPE_MAPPING[eventName] ?? [];
    }
    validateTenant(event, auth) {
        if (event.tenantId !== auth.tenantId) {
            throw new CursorGatewayError('tenant-mismatch', 403, 'tenant');
        }
    }
    validateTokenExpiry(auth, now) {
        const expires = Date.parse(auth.tokenExpiresAt);
        if (Number.isNaN(expires)) {
            throw new CursorGatewayError('token-expiry-invalid', 401, 'token');
        }
        if (expires <= now.getTime()) {
            throw new CursorGatewayError('token-expired', 401, 'token');
        }
    }
    buildPolicyContext(event, auth) {
        return {
            repoMeta: auth.repoMeta,
            scan: auth.scan,
            purpose: auth.purpose ?? event.purpose,
            dataClasses: auth.dataClasses,
            model: auth.model ?? event.model,
            story: auth.storyRef,
        };
    }
    buildDenyDecision(now, explanation, event, ruleIds) {
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
exports.CursorGateway = CursorGateway;
class BudgetManager {
    budgets;
    defaultBudget;
    now;
    states = new Map();
    constructor(options) {
        this.budgets = options.budgets;
        this.defaultBudget = options.defaultBudget;
        this.now = options.now ?? (() => new Date());
    }
    consume(tenantId, usage, at = this.now(), opts = {}) {
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
        const currencyAllowed = config.currency === undefined || nextCurrency <= config.currency;
        const allowed = tokensAllowed && currencyAllowed;
        const alertThreshold = config.alertPercent ?? 0.8;
        const tokenAlert = nextTokens >= config.tokens * alertThreshold;
        const currencyAlert = config.currency !== undefined &&
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
            remainingCurrency: config.currency !== undefined
                ? Math.max(config.currency - nextCurrency, 0)
                : undefined,
            alertTriggered: tokenAlert || currencyAlert,
            budget: config,
            state: { ...state },
        };
    }
    buildBudgetReason(tokensAllowed, currencyAllowed) {
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
    resolveState(tenantId, config, at) {
        const existing = this.states.get(tenantId);
        if (!existing) {
            const initial = {
                windowStartedAt: at.getTime(),
                tokensConsumed: 0,
                currencyConsumed: 0,
                lastEventAt: at.getTime(),
            };
            this.states.set(tenantId, initial);
            return initial;
        }
        const windowExpired = at.getTime() - existing.windowStartedAt >= config.windowMs;
        if (windowExpired) {
            existing.windowStartedAt = at.getTime();
            existing.tokensConsumed = 0;
            existing.currencyConsumed = 0;
        }
        return existing;
    }
}
exports.BudgetManager = BudgetManager;
class RateLimiter {
    config;
    now;
    states = new Map();
    constructor(options) {
        this.config = options.config;
        this.now = options.now ?? (() => Date.now());
    }
    check(event, timestamp = this.now()) {
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
exports.RateLimiter = RateLimiter;
function createGatewayHttpServer(options) {
    const server = (0, node_http_1.createServer)(async (req, res) => {
        const url = new node_url_1.URL(req.url ?? '', 'http://localhost');
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
            res.end(JSON.stringify({
                decision: result.decision,
                budget: result.budget,
                rateLimit: result.rateLimit,
                checksum: result.record.checksum,
            }));
        }
        catch (error) {
            if (error instanceof CursorGatewayError) {
                res.writeHead(error.status, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: error.message, ruleId: error.ruleId }));
                return;
            }
            options.logger?.error?.('cursor.gateway.error', {
                message: error.message,
            });
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'internal-error' }));
        }
    });
    return server;
}
async function readJson(req) {
    const chunks = [];
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
function normalizePayloadToEvent(payload) {
    if (isCursorEvent(payload)) {
        return payload;
    }
    if (isCursorEventPayload(payload)) {
        return (0, common_types_1.normalizeCursorEvent)(payload);
    }
    throw new CursorGatewayError('invalid-event-payload', 400, 'payload');
}
function isCursorEvent(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'tenantId' in value &&
        'event' in value &&
        'provenance' in value);
}
function isCursorEventPayload(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'tenant_id' in value &&
        'provenance' in value);
}
function buildAuthContext(payload, req, event) {
    const scopes = parseScopes(payload?.scopes ?? req.headers['x-mc-scopes']);
    const actor = payload?.actor ?? {
        id: payload?.actorId ?? req.headers['x-actor-id'] ?? event.actor.id,
        email: payload?.actorEmail ?? req.headers['x-actor-email'] ?? event.actor.email,
        displayName: payload?.actorDisplayName ??
            req.headers['x-actor-display-name'] ??
            event.actor.displayName,
    };
    return {
        tenantId: payload?.tenantId ?? event.tenantId,
        actor,
        deviceId: payload?.deviceId ?? req.headers['x-device-id'],
        scopes,
        tokenExpiresAt: payload?.tokenExpiresAt ??
            req.headers['x-token-expiry'] ??
            new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        mTLSFingerprint: payload?.mTLSFingerprint ??
            req.headers['x-mtls-fingerprint'],
        purpose: payload?.purpose,
        storyRef: payload?.storyRef ?? event.storyRef,
        attributes: payload?.attributes,
        dataClasses: payload?.dataClasses ?? event.dataClasses,
        repoMeta: payload?.repoMeta,
        scan: payload?.scan,
        model: payload?.model ?? event.model,
        requestIp: req.socket.remoteAddress ?? undefined,
        requestId: req.headers['x-request-id'] ?? payload?.requestId,
    };
}
function parseScopes(input) {
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
var normalization_js_1 = require("./normalization.js");
Object.defineProperty(exports, "TicketNormalizer", { enumerable: true, get: function () { return normalization_js_1.TicketNormalizer; } });
var graphql_cost_js_2 = require("./graphql-cost.js");
Object.defineProperty(exports, "GraphQLCostAnalyzer", { enumerable: true, get: function () { return graphql_cost_js_2.GraphQLCostAnalyzer; } });
Object.defineProperty(exports, "GraphQLRateLimiter", { enumerable: true, get: function () { return graphql_cost_js_2.GraphQLRateLimiter; } });
var acceptanceCriteria_js_1 = require("./acceptanceCriteria.js");
Object.defineProperty(exports, "AcceptanceCriteriaSynthesizer", { enumerable: true, get: function () { return acceptanceCriteria_js_1.AcceptanceCriteriaSynthesizer; } });
Object.defineProperty(exports, "AcceptanceCriteriaVerifier", { enumerable: true, get: function () { return acceptanceCriteria_js_1.AcceptanceCriteriaVerifier; } });
var policyTagger_js_1 = require("./policyTagger.js");
Object.defineProperty(exports, "PolicyTagger", { enumerable: true, get: function () { return policyTagger_js_1.PolicyTagger; } });
var capabilityRegistry_js_1 = require("./capabilityRegistry.js");
Object.defineProperty(exports, "CapabilityRegistry", { enumerable: true, get: function () { return capabilityRegistry_js_1.CapabilityRegistry; } });
var policyRouter_js_1 = require("./policyRouter.js");
Object.defineProperty(exports, "PolicyRouter", { enumerable: true, get: function () { return policyRouter_js_1.PolicyRouter; } });
var promptOps_js_1 = require("./promptOps.js");
Object.defineProperty(exports, "ContextPlanner", { enumerable: true, get: function () { return promptOps_js_1.ContextPlanner; } });
Object.defineProperty(exports, "InstructionCompiler", { enumerable: true, get: function () { return promptOps_js_1.InstructionCompiler; } });
Object.defineProperty(exports, "SelfRefineLoop", { enumerable: true, get: function () { return promptOps_js_1.SelfRefineLoop; } });
Object.defineProperty(exports, "GuardedGenerator", { enumerable: true, get: function () { return promptOps_js_1.GuardedGenerator; } });
var orchestrator_js_2 = require("./cooperation/orchestrator.js");
Object.defineProperty(exports, "CooperationOrchestrator", { enumerable: true, get: function () { return orchestrator_js_2.CooperationOrchestrator; } });
var semanticBraid_js_1 = require("./cooperation/semanticBraid.js");
Object.defineProperty(exports, "SemanticBraidCoordinator", { enumerable: true, get: function () { return semanticBraid_js_1.SemanticBraidCoordinator; } });
var counterfactualShadowing_js_1 = require("./cooperation/counterfactualShadowing.js");
Object.defineProperty(exports, "CounterfactualShadowingCoordinator", { enumerable: true, get: function () { return counterfactualShadowing_js_1.CounterfactualShadowingCoordinator; } });
var causalChallengeGames_js_1 = require("./cooperation/causalChallengeGames.js");
Object.defineProperty(exports, "CausalChallengeGamesCoordinator", { enumerable: true, get: function () { return causalChallengeGames_js_1.CausalChallengeGamesCoordinator; } });
var crossEntropySwaps_js_1 = require("./cooperation/crossEntropySwaps.js");
Object.defineProperty(exports, "CrossEntropySwapCoordinator", { enumerable: true, get: function () { return crossEntropySwaps_js_1.CrossEntropySwapCoordinator; } });
var proofOfUsefulWorkbook_js_1 = require("./cooperation/proofOfUsefulWorkbook.js");
Object.defineProperty(exports, "ProofOfUsefulWorkbookCoordinator", { enumerable: true, get: function () { return proofOfUsefulWorkbook_js_1.ProofOfUsefulWorkbookCoordinator; } });
var gateway_js_1 = require("./federation/gateway.js");
Object.defineProperty(exports, "FederatedGateway", { enumerable: true, get: function () { return gateway_js_1.FederatedGateway; } });
var composition_js_1 = require("./federation/composition.js");
Object.defineProperty(exports, "composeServices", { enumerable: true, get: function () { return composition_js_1.composeServices; } });
