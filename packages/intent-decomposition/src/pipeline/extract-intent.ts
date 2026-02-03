import { IntentStatement, StepSummary, StepSummaryFactual } from '../types.js';
import { fillTemplate, loadPromptTemplate } from '../utils/prompt.js';
import { safeJsonParse } from '../utils/json.js';
import { OpenAICompatibleClient } from '../llm/openai-client.js';

export interface ExtractIntentOptions {
  modelId: string;
  promptId: string;
  promptVersion: string;
  promptPath: string;
  baseUrl: string;
  apiKey?: string;
  maxTokens?: number;
}

export function stripSpeculation(
  summaries: StepSummary[],
): StepSummaryFactual[] {
  return summaries.map((summary) => ({
    schemaVersion: summary.schemaVersion,
    screenContext: summary.screenContext,
    actions: summary.actions,
    locale: summary.locale,
    provenance: summary.provenance,
  }));
}

export async function extractIntent(
  summaries: StepSummaryFactual[],
  options: ExtractIntentOptions,
): Promise<IntentStatement> {
  const prompt = await loadPromptTemplate(
    options.promptPath,
    options.promptId,
    options.promptVersion,
  );
  const client = new OpenAICompatibleClient(options.baseUrl, options.apiKey);

  const promptText = fillTemplate(prompt.content, {
    summaries: JSON.stringify(summaries, null, 2),
  });

  const response = await client.complete(promptText, {
    model: options.modelId,
    maxTokens: options.maxTokens ?? 350,
    temperature: 0.2,
  });

  const parsed = safeJsonParse<IntentStatement>(response);
  return {
    ...parsed,
    schemaVersion: parsed.schemaVersion ?? 'v1',
    provenance: {
      ...parsed.provenance,
      modelId: options.modelId,
      promptHash: prompt.sha256,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      generatedAt: new Date().toISOString(),
    },
  };
}
