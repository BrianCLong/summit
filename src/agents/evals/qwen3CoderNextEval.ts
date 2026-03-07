import type { ChatProvider } from '../providers/providerTypes';
import { lintPromptTemplate } from '../guards/promptTemplateLint';
import { assertTokenBudget } from '../guards/tokenBudget';

type Qwen3CoderNextEvalInput = {
  provider: ChatProvider;
  model: string;
  promptTemplate: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

export async function runQwen3CoderNextEval(
  input: Qwen3CoderNextEvalInput,
): Promise<{ responseText: string }> {
  lintPromptTemplate(input.promptTemplate);
  assertTokenBudget({
    maxInputTokens: input.maxInputTokens,
    maxOutputTokens: input.maxOutputTokens,
  });

  const result = await input.provider.chat({
    model: input.model,
    messages: [{ role: 'user', content: input.promptTemplate }],
  });

  return { responseText: result.text };
}
