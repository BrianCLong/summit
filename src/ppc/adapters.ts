import {
  GuardTrace,
  GuardViolation,
  Policy,
  PolicyExecution,
} from './types';
import {
  BudgetDecision,
  BudgetUsage,
  BudgetLimit,
  BudgetContext,
  LlmBudgetEngine,
  createEngineWithOverrides,
} from '../core/llmBudget';

export interface LLMRequest {
  prompt: string;
  tools?: string[];
  metadata?: Record<string, unknown>;
  response?: string;
  budget?: {
    feature?: string;
    tenantId?: string;
    environment?: string;
    estimatedTokens?: number;
    estimatedCostUsd?: number;
  };
}

export interface GuardedLLMResult {
  blocked: boolean;
  blockedBy?: string;
  prompt: string;
  response?: string;
  tools: string[];
  metadata: Record<string, unknown>;
  trace: GuardTrace[];
  stage: 'prompt' | 'response' | 'complete';
  violations: GuardViolation[];
}

export interface OpenAIStubCompletion {
  output?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface OpenAIStub {
  complete(request: { prompt: string; tools?: string[] }): Promise<
    OpenAIStubCompletion | string
  >;
}

export interface AnthropicStubCompletion {
  text?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface AnthropicStub {
  respond(request: { prompt: string; tools?: string[] }): Promise<
    AnthropicStubCompletion | string
  >;
}

const normalizeOutput = (
  completion: string | OpenAIStubCompletion | AnthropicStubCompletion
): { output: string; metadata: Record<string, unknown> } => {
  if (typeof completion === 'string') {
    return { output: completion, metadata: {} };
  }

  const output =
    completion.output ?? completion.content ?? completion.text ?? '';

  return {
    output,
    metadata: { ...(completion.metadata ?? {}) },
  };
};

const mergeTraces = (first: GuardTrace[], second: GuardTrace[]): GuardTrace[] => {
  const offset = first.length;
  return [
    ...first,
    ...second.map((trace) => ({
      ...trace,
      order: trace.order + offset,
    })),
  ];
};

const mergeViolations = (
  first: GuardViolation[],
  second: GuardViolation[]
): GuardViolation[] => [...first, ...second];

const createBudgetEngine = (): LlmBudgetEngine => {
  const budgetLogger = {
    info: (message: string, meta?: Record<string, unknown>) =>
      console.info(`[llm-budget] ${message}`, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      console.warn(`[llm-budget] ${message}`, meta),
  };

  return createEngineWithOverrides(process.env.LLM_BUDGET_OVERRIDES, {
    logger: budgetLogger,
  });
};

const budgetEngine = createBudgetEngine();

const inferBudgetContext = (request: LLMRequest): BudgetContext => {
  const environment =
    request.budget?.environment ||
    (process.env.APP_ENV as string | undefined) ||
    (process.env.NODE_ENV as string | undefined) ||
    'dev';

  return {
    environment,
    feature: request.budget?.feature || (request.metadata?.feature as string | undefined),
    tenantId:
      request.budget?.tenantId || (request.metadata?.tenantId as string | undefined),
    metadata: request.metadata,
  };
};

const estimateBudgetUsage = (request: LLMRequest): BudgetUsage => {
  const estimatedTokens =
    request.budget?.estimatedTokens ?? Math.max(1, Math.round(request.prompt.length / 4));
  const estimatedUsd = request.budget?.estimatedCostUsd ?? 0;

  return {
    tokens: estimatedTokens,
    usd: estimatedUsd,
    requests: 1,
  };
};

const annotateBudgetMetadata = (
  result: GuardedLLMResult,
  decision: BudgetDecision,
  scopeHit?: string,
  remaining?: BudgetLimit
): GuardedLLMResult => ({
  ...result,
  metadata: {
    ...result.metadata,
    budgetDecision: decision,
    budgetScope: scopeHit,
    budgetRemaining: remaining,
  },
});

const blockedByBudget = (
  request: LLMRequest,
  scopeHit?: string,
  message?: string
): GuardedLLMResult => ({
  blocked: true,
  blockedBy: scopeHit || 'llm_budget',
  prompt: request.prompt,
  response: message || 'LLM usage capped for this scope.',
  tools: request.tools ?? [],
  metadata: { ...request.metadata, budgetDecision: BudgetDecision.HARD_LIMIT },
  trace: [],
  stage: 'prompt',
  violations: [],
});

const runPromptStage = async (
  policy: Policy,
  provider: string,
  request: LLMRequest
): Promise<PolicyExecution> =>
  policy.execute({
    prompt: request.prompt,
    tools: request.tools,
    metadata: { provider, ...(request.metadata ?? {}) },
  });

const runResponseStage = async (
  policy: Policy,
  provider: string,
  promptResult: PolicyExecution,
  responseText: string
): Promise<PolicyExecution> =>
  policy.execute({
    prompt: promptResult.prompt,
    response: responseText,
    tools: promptResult.tools,
    metadata: { ...promptResult.metadata, provider },
  });

const dryRun = async (
  policy: Policy,
  provider: string,
  request: LLMRequest
): Promise<GuardedLLMResult> => {
  const evaluation = await policy.dryRun({
    prompt: request.prompt,
    response: request.response,
    tools: request.tools,
    metadata: { provider, ...(request.metadata ?? {}) },
  });

  return {
    blocked: !evaluation.allowed,
    blockedBy: evaluation.blockedBy,
    prompt: evaluation.prompt,
    response: evaluation.response,
    tools: evaluation.tools,
    metadata: evaluation.metadata,
    trace: evaluation.trace,
    stage: request.response ? 'response' : 'prompt',
    violations: evaluation.violations,
  };
};

export const createOpenAIAdapter = (
  policy: Policy,
  client: OpenAIStub
) => ({
  async complete(request: LLMRequest): Promise<GuardedLLMResult> {
    const budgetContext = inferBudgetContext(request);
    const budgetUsage = estimateBudgetUsage(request);
    const budgetDecision = await budgetEngine.checkAndConsume(
      budgetContext,
      budgetUsage
    );

    if (budgetDecision.decision === BudgetDecision.HARD_LIMIT) {
      return blockedByBudget(request, budgetDecision.scopeHit, budgetDecision.message);
    }

    const promptStage = await runPromptStage(policy, 'openai', request);
    if (!promptStage.allowed) {
      return {
        blocked: true,
        blockedBy: promptStage.blockedBy,
        prompt: promptStage.prompt,
        response: promptStage.response,
        tools: promptStage.tools,
        metadata: promptStage.metadata,
        trace: promptStage.trace,
        stage: 'prompt',
        violations: promptStage.violations,
      };
    }

    const completion = await client.complete({
      prompt: promptStage.prompt,
      tools: promptStage.tools,
    });

    const normalized = normalizeOutput(completion);

    const responseStage = await runResponseStage(
      policy,
      'openai',
      promptStage,
      normalized.output
    );

    const trace = mergeTraces(promptStage.trace, responseStage.trace);
    const violations = mergeViolations(
      promptStage.violations,
      responseStage.violations
    );

    if (!responseStage.allowed) {
      return {
        blocked: true,
        blockedBy: responseStage.blockedBy,
        prompt: promptStage.prompt,
        response: responseStage.response ?? normalized.output,
        tools: responseStage.tools,
        metadata: { ...promptStage.metadata, ...normalized.metadata },
        trace,
        stage: 'response',
        violations,
      };
    }

    return annotateBudgetMetadata(
      {
        blocked: false,
        prompt: responseStage.prompt,
        response: responseStage.response ?? normalized.output,
        tools: responseStage.tools,
        metadata: { ...promptStage.metadata, ...normalized.metadata },
        trace,
        stage: 'complete',
        violations,
      },
      budgetDecision.decision,
      budgetDecision.scopeHit,
      budgetDecision.remaining
    );
  },
  dryRun(request: LLMRequest): Promise<GuardedLLMResult> {
    return dryRun(policy, 'openai', request);
  },
});

export const createAnthropicAdapter = (
  policy: Policy,
  client: AnthropicStub
) => ({
  async complete(request: LLMRequest): Promise<GuardedLLMResult> {
    const budgetContext = inferBudgetContext(request);
    const budgetUsage = estimateBudgetUsage(request);
    const budgetDecision = await budgetEngine.checkAndConsume(
      budgetContext,
      budgetUsage
    );

    if (budgetDecision.decision === BudgetDecision.HARD_LIMIT) {
      return blockedByBudget(request, budgetDecision.scopeHit, budgetDecision.message);
    }

    const promptStage = await runPromptStage(policy, 'anthropic', request);
    if (!promptStage.allowed) {
      return {
        blocked: true,
        blockedBy: promptStage.blockedBy,
        prompt: promptStage.prompt,
        response: promptStage.response,
        tools: promptStage.tools,
        metadata: promptStage.metadata,
        trace: promptStage.trace,
        stage: 'prompt',
        violations: promptStage.violations,
      };
    }

    const completion = await client.respond({
      prompt: promptStage.prompt,
      tools: promptStage.tools,
    });

    const normalized = normalizeOutput(completion);

    const responseStage = await runResponseStage(
      policy,
      'anthropic',
      promptStage,
      normalized.output
    );
    const trace = mergeTraces(promptStage.trace, responseStage.trace);
    const violations = mergeViolations(
      promptStage.violations,
      responseStage.violations
    );

    if (!responseStage.allowed) {
      return {
        blocked: true,
        blockedBy: responseStage.blockedBy,
        prompt: promptStage.prompt,
        response: responseStage.response ?? normalized.output,
        tools: responseStage.tools,
        metadata: { ...promptStage.metadata, ...normalized.metadata },
        trace,
        stage: 'response',
        violations,
      };
    }

    return annotateBudgetMetadata(
      {
        blocked: false,
        prompt: responseStage.prompt,
        response: responseStage.response ?? normalized.output,
        tools: responseStage.tools,
        metadata: { ...promptStage.metadata, ...normalized.metadata },
        trace,
        stage: 'complete',
        violations,
      },
      budgetDecision.decision,
      budgetDecision.scopeHit,
      budgetDecision.remaining
    );
  },
  dryRun(request: LLMRequest): Promise<GuardedLLMResult> {
    return dryRun(policy, 'anthropic', request);
  },
});
