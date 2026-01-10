import { LLMRouter } from './LLMRouter.js';
import { llmRouterConfig } from '../../config/llm-router.config.js';
import { LLMRequest, LLMResult } from './interfaces.js';
import type { AgentTurn, ContextDiagnostics } from '@intelgraph/agent-context';
import { AgentContextManager } from '@intelgraph/agent-context';
import {
  agentContextDefaults,
  buildAgentContextManager,
} from '../../config/agent-context.config.js';
import { metrics } from '../../observability/metrics.js';
import { logger } from '../../utils/logger.js';

export class MaestroLLMService {
  private router: LLMRouter;
  private static instance: MaestroLLMService;
  private contextManager: AgentContextManager;

  private constructor() {
    this.router = new LLMRouter(llmRouterConfig);
    this.contextManager = buildAgentContextManager();
  }

  public static getInstance(): MaestroLLMService {
    if (!MaestroLLMService.instance) {
      MaestroLLMService.instance = new MaestroLLMService();
    }
    return MaestroLLMService.instance;
  }

  public async executeTaskLLM(params: {
    taskType: string;
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    context?: Record<string, any>;
    runId?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
    turn?: AgentTurn;
    strategyOverride?: 'masking' | 'summarization' | 'hybrid' | 'raw';
    tokenBudget?: number;
    agentId?: string;
    taskId?: string;
  }): Promise<LLMResult> {
    if (params.turn) {
      const enrichedTurn: AgentTurn = {
        ...params.turn,
        meta: {
          ...params.turn.meta,
          runId: params.runId,
          agentId: params.agentId ?? params.metadata?.agentId,
          taskId: params.taskId ?? params.metadata?.taskId,
        },
      };
      await this.contextManager.ingestTurn(enrichedTurn);
    }

    const promptContext = await this.contextManager.buildPromptContext({
      tokenBudget: params.tokenBudget || agentContextDefaults.tokenBudget,
      reservedForResponse: agentContextDefaults.reservedForResponse,
      maxContextPct: agentContextDefaults.maxContextPct,
      strategy: params.strategyOverride || agentContextDefaults.strategy,
      maskingWindow: agentContextDefaults.maskingWindow,
      summarizationTurnThreshold:
        agentContextDefaults.summarizationTurnThreshold,
      summarizationTokenThreshold:
        agentContextDefaults.summarizationTokenThreshold,
      maxTurns: agentContextDefaults.maxTurns,
      maxCostUsd: agentContextDefaults.maxCostUsd,
      plateauWindow: agentContextDefaults.plateauWindow,
    });

    this.recordContextMetrics(promptContext.diagnostics, params.taskType);

    if (promptContext.diagnostics.shouldHalt) {
      const stopReasons = promptContext.diagnostics.stopReasons.join('; ');
      logger.warn(
        { taskType: params.taskType, stopReasons },
        'Agent context stop conditions met',
      );
      return {
        ok: false,
        error: `Agent context stop: ${stopReasons}`,
        metadata: {
          stopReasons: promptContext.diagnostics.stopReasons,
        },
      };
    }

    const request: LLMRequest = {
      taskType: params.taskType,
      prompt: params.prompt,
      messages: params.messages || promptContext.messages,
      context: params.context,
      runId: params.runId,
      tenantId: params.tenantId,
      metadata: params.metadata,
    };

    logger.debug(
      {
        taskType: params.taskType,
        agentContext: promptContext.diagnostics,
      },
      '[agent-context] diagnostics',
    );

    return this.router.execute(request);
  }

  private recordContextMetrics(
    diagnostics: ContextDiagnostics,
    taskType: string,
  ): void {
    const labels = { strategy: diagnostics.strategy, task_type: taskType };
    metrics.agentContextTokensIn.observe(labels, diagnostics.contextTokensIn);
    metrics.agentContextTokensOut.observe(labels, diagnostics.contextTokensOut);
    metrics.agentContextMaskedObservationTokens.observe(
      labels,
      diagnostics.maskedObservationTokens,
    );
    metrics.agentContextSummaryTokens.observe(labels, diagnostics.summaryTokens);
    metrics.agentContextSummaryCalls.inc(labels, diagnostics.summaryCalls);
    metrics.agentContextTurnCount.observe(labels, diagnostics.totalTurns);
    if (typeof diagnostics.estimatedCostUsd === 'number') {
      metrics.agentContextEstimatedCostUsd.observe(
        labels,
        diagnostics.estimatedCostUsd,
      );
    }
  }
}
