import { v4 as uuidv4 } from 'uuid';
import { getIO } from '../server/realtime/socket';
import { Planner } from './reasoning/planner';
import { ToolRetriever } from '../tools/retriever';
import { ToolExecutor } from '../tools/executor';
import { MemoryStore } from './memory/store';
import { MemoryFolding } from './memory/folding';
import { ProvenanceLedger } from '../provenance/ledger';
import { PubSub } from 'graphql-subscriptions';
import { LLM } from './reasoning/llm';

const pubsub = new PubSub();

export class AgentLoop {
  private runId: string;
  private status: string;
  private planner: Planner;
  private toolRetriever: ToolRetriever;
  private toolExecutor: ToolExecutor;
  private memoryStore: MemoryStore;
  private memoryFolding: MemoryFolding;
  private provenanceLedger: ProvenanceLedger;
  private llm: LLM;
  private step = 0;

  constructor(
    private tenantId: string,
    private actor: string,
    private task: string,
    private goalHints: string[],
    private toolFilters: string[],
    private purpose: string
  ) {
    this.runId = uuidv4();
    this.status = 'IDLE';
    this.llm = new LLM();
    this.planner = new Planner(this.tenantId, this.runId, this.llm);
    this.toolRetriever = new ToolRetriever();
    this.toolExecutor = new ToolExecutor();
    this.memoryStore = new MemoryStore();
    this.memoryFolding = new MemoryFolding(this.tenantId, this.llm, this.purpose);
    this.provenanceLedger = new ProvenanceLedger();
  }

  public getRunId(): string {
    return this.runId;
  }

  private async emitEvent(type: string, data: any) {
    const event = { runId: this.runId, type, data, ts: new Date().toISOString() };
    getIO().emit('agent-event', event);
    pubsub.publish(`RUN_EVENTS_${this.runId}`, { runEvents: event });
    await this.memoryStore.addEpisodicMemory(this.tenantId, { run_id: this.runId, tenant_id: this.tenantId, step: this.step, event_json: event, ts: new Date() });
    await this.provenanceLedger.recordEvent(this.tenantId, this.runId, this.actor, type, data);
  }

  public async start() {
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
          } else {
            await this.emitEvent('error', { message: `Tool ${action.name} not found.`});
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
