import {
  GuardTrace,
  GuardViolation,
  Policy,
  PolicyExecution,
} from './types';

export interface LLMRequest {
  prompt: string;
  tools?: string[];
  metadata?: Record<string, unknown>;
  response?: string;
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

    return {
      blocked: false,
      prompt: responseStage.prompt,
      response: responseStage.response ?? normalized.output,
      tools: responseStage.tools,
      metadata: { ...promptStage.metadata, ...normalized.metadata },
      trace,
      stage: 'complete',
      violations,
    };
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

    return {
      blocked: false,
      prompt: responseStage.prompt,
      response: responseStage.response ?? normalized.output,
      tools: responseStage.tools,
      metadata: { ...promptStage.metadata, ...normalized.metadata },
      trace,
      stage: 'complete',
      violations,
    };
  },
  dryRun(request: LLMRequest): Promise<GuardedLLMResult> {
    return dryRun(policy, 'anthropic', request);
  },
});
