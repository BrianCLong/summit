"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoop = void 0;
const uuid_1 = require("uuid");
const socket_1 = require("../server/realtime/socket");
const planner_1 = require("./reasoning/planner");
const retriever_1 = require("../tools/retriever");
const executor_1 = require("../tools/executor");
const store_1 = require("./memory/store");
const folding_1 = require("./memory/folding");
const ledger_1 = require("../provenance/ledger");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const llm_1 = require("./reasoning/llm");
const pubsub = new graphql_subscriptions_1.PubSub();
class AgentLoop {
    tenantId;
    actor;
    task;
    goalHints;
    toolFilters;
    purpose;
    runId;
    status;
    planner;
    toolRetriever;
    toolExecutor;
    memoryStore;
    memoryFolding;
    provenanceLedger;
    llm;
    step = 0;
    constructor(tenantId, actor, task, goalHints, toolFilters, purpose) {
        this.tenantId = tenantId;
        this.actor = actor;
        this.task = task;
        this.goalHints = goalHints;
        this.toolFilters = toolFilters;
        this.purpose = purpose;
        this.runId = (0, uuid_1.v4)();
        this.status = 'IDLE';
        this.llm = new llm_1.LLM();
        this.planner = new planner_1.Planner(this.tenantId, this.runId, this.llm);
        this.toolRetriever = new retriever_1.ToolRetriever();
        this.toolExecutor = new executor_1.ToolExecutor();
        this.memoryStore = new store_1.MemoryStore();
        this.memoryFolding = new folding_1.MemoryFolding(this.tenantId, this.llm, this.purpose);
        this.provenanceLedger = new ledger_1.ProvenanceLedger();
    }
    getRunId() {
        return this.runId;
    }
    async emitEvent(type, data) {
        const event = { runId: this.runId, type, data, ts: new Date().toISOString() };
        (0, socket_1.getIO)().emit('agent-event', event);
        pubsub.publish(`RUN_EVENTS_${this.runId}`, { runEvents: event });
        await this.memoryStore.addEpisodicMemory(this.tenantId, { run_id: this.runId, tenant_id: this.tenantId, step: this.step, event_json: event, ts: new Date() });
        await this.provenanceLedger.recordEvent(this.tenantId, this.runId, this.actor, type, data);
    }
    async start() {
        this.status = 'RUNNING';
        await this.emitEvent('status', this.status);
        while (this.status === 'RUNNING') {
            this.step++;
            const action = await this.planner.decide();
            await this.emitEvent('action', action);
            switch (action.type) {
                case 'search_tools':
                    const tools = await this.toolRetriever.retrieve(this.tenantId, action.query);
                    await this.emitEvent('tool-retrieval', { query: action.query, results: tools });
                    break;
                case 'call_tool':
                    const tool = await this.toolRetriever.retrieve(this.tenantId, action.name, 1);
                    if (tool.length > 0) {
                        const result = await this.toolExecutor.execute(tool[0], action.params, this.actor, this.tenantId);
                        await this.emitEvent('tool-call', { name: action.name, params: action.params, result });
                        await this.memoryStore.updateToolMemory(this.tenantId, { run_id: this.runId, tenant_id: this.tenantId, tool_id: tool[0].id, usage_stats: {}, last_result: result, ts: new Date() });
                    }
                    else {
                        await this.emitEvent('error', { message: `Tool ${action.name} not found.` });
                    }
                    break;
                case 'fold_memory':
                    await this.memoryFolding.fold(this.runId);
                    await this.emitEvent('memory-fold', { reason: action.reason });
                    break;
                case 'finish':
                    this.status = 'FINISHED';
                    await this.emitEvent('status', this.status);
                    await this.emitEvent('final-answer', { answer: action.answer, evidence: action.evidence });
                    break;
            }
        }
    }
}
exports.AgentLoop = AgentLoop;
