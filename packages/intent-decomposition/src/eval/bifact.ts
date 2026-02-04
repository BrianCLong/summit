import { BiFactEntailment, BiFactEval } from '../types.js';
import { fillTemplate, loadPromptTemplate, PromptTemplate } from '../utils/prompt.js';
import { safeJsonParse } from '../utils/json.js';
import { OpenAICompatibleClient } from '../llm/openai-client.js';

export interface BiFactOptions {
  modelId: string;
  promptId: string;
  promptVersion: string;
  promptPath: string;
  baseUrl: string;
  apiKey?: string;
  maxTokens?: number;
}

export interface BiFactPrompts {
  extractFacts: BiFactOptions;
  entailment: BiFactOptions;
}

export interface BiFactInput {
  referenceIntent: string;
  predictedIntent: string;
  stage1Facts: string[];
}

function computeScores(
  predicted: string[],
  refEntailed: BiFactEntailment[],
  predEntailed: BiFactEntailment[],
): { precision: number; recall: number; f1: number } {
  const truePos = predEntailed.filter((entry) => entry.entails).length;
  const precision = predicted.length ? truePos / predicted.length : 0;
  const recall = refEntailed.length
    ? refEntailed.filter((entry) => entry.entails).length / refEntailed.length
    : 0;
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

async function extractFacts(
  intent: string,
  template: PromptTemplate,
  options: BiFactOptions,
): Promise<string[]> {
  const client = new OpenAICompatibleClient(options.baseUrl, options.apiKey);
  const promptText = fillTemplate(template.content, {
    intent,
  });
  const response = await client.complete(promptText, {
    model: options.modelId,
    maxTokens: options.maxTokens ?? 300,
    temperature: 0,
  });
  const parsed = safeJsonParse<{ facts: string[] }>(response);
  return parsed.facts;
}

async function entailmentCheck(
  premiseFacts: string[],
  hypothesisFacts: string[],
  template: PromptTemplate,
  options: BiFactOptions,
): Promise<BiFactEntailment[]> {
  const client = new OpenAICompatibleClient(options.baseUrl, options.apiKey);
  const promptText = fillTemplate(template.content, {
    premiseFacts: JSON.stringify(premiseFacts, null, 2),
    hypothesisFacts: JSON.stringify(hypothesisFacts, null, 2),
  });
  const response = await client.complete(promptText, {
    model: options.modelId,
    maxTokens: options.maxTokens ?? 400,
    temperature: 0,
  });
  const parsed = safeJsonParse<{ entailments: BiFactEntailment[] }>(response);
  return parsed.entailments;
}

export async function evaluateBiFact(
  input: BiFactInput,
  prompts: BiFactPrompts,
): Promise<BiFactEval> {
  const extractTemplate = await loadPromptTemplate(
    prompts.extractFacts.promptPath,
    prompts.extractFacts.promptId,
    prompts.extractFacts.promptVersion,
  );
  const entailTemplate = await loadPromptTemplate(
    prompts.entailment.promptPath,
    prompts.entailment.promptId,
    prompts.entailment.promptVersion,
  );

  const referenceFacts = await extractFacts(
    input.referenceIntent,
    extractTemplate,
    prompts.extractFacts,
  );
  const predictedFacts = await extractFacts(
    input.predictedIntent,
    extractTemplate,
    prompts.extractFacts,
  );

  const referenceEntailedByPrediction = await entailmentCheck(
    predictedFacts,
    referenceFacts,
    entailTemplate,
    prompts.entailment,
  );
  const predictionEntailedByReference = await entailmentCheck(
    referenceFacts,
    predictedFacts,
    entailTemplate,
    prompts.entailment,
  );

  const scores = computeScores(
    predictedFacts,
    referenceEntailedByPrediction,
    predictionEntailedByReference,
  );

  const missedFacts = referenceEntailedByPrediction
    .filter((entry) => !entry.entails)
    .map((entry) => entry.fact)
    .filter((fact) => !input.stage1Facts.includes(fact));
  const hallucinatedFacts = predictionEntailedByReference
    .filter((entry) => !entry.entails)
    .map((entry) => entry.fact);

  return {
    schemaVersion: 'v1',
    referenceFacts,
    predictedFacts,
    referenceEntailedByPrediction,
    predictionEntailedByReference,
    precision: scores.precision,
    recall: scores.recall,
    f1: scores.f1,
    errorPropagation: {
      missedFacts,
      hallucinatedFacts,
    },
    evaluatedAt: new Date().toISOString(),
    judge: {
      modelId: prompts.entailment.modelId,
      promptHash: entailTemplate.sha256,
      promptId: prompts.entailment.promptId,
      promptVersion: prompts.entailment.promptVersion,
    },
  };
}
