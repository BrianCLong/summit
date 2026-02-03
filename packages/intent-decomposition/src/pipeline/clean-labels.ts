import { StepSummaryFactual } from '../types.js';
import { fillTemplate, loadPromptTemplate } from '../utils/prompt.js';
import { OpenAICompatibleClient } from '../llm/openai-client.js';

export interface CleanLabelOptions {
  modelId: string;
  promptId: string;
  promptVersion: string;
  promptPath: string;
  baseUrl: string;
  apiKey?: string;
  maxTokens?: number;
}

export async function cleanGoldIntent(
  summaries: StepSummaryFactual[],
  goldIntent: string,
  options: CleanLabelOptions,
): Promise<string> {
  const prompt = await loadPromptTemplate(
    options.promptPath,
    options.promptId,
    options.promptVersion,
  );
  const client = new OpenAICompatibleClient(options.baseUrl, options.apiKey);

  const promptText = fillTemplate(prompt.content, {
    summaries: JSON.stringify(summaries, null, 2),
    goldIntent,
  });

  const response = await client.complete(promptText, {
    model: options.modelId,
    maxTokens: options.maxTokens ?? 250,
    temperature: 0,
  });

  return response.trim();
}
