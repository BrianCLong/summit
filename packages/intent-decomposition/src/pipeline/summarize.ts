import { readFile } from 'fs/promises';
import path from 'path';
import { StepSummary, TrajectoryInput, UIAction, UIFrame } from '../types.js';
import { fillTemplate, loadPromptTemplate } from '../utils/prompt.js';
import { safeJsonParse } from '../utils/json.js';
import { OpenAICompatibleClient } from '../llm/openai-client.js';

export interface SummarizeOptions {
  modelId: string;
  promptId: string;
  promptVersion: string;
  promptPath: string;
  baseUrl: string;
  apiKey?: string;
  maxTokens?: number;
}

function buildWindow(frames: UIFrame[], index: number): {
  previous?: UIFrame;
  current: UIFrame;
  next?: UIFrame;
} {
  return {
    previous: frames[index - 1],
    current: frames[index],
    next: frames[index + 1],
  };
}

function actionsForFrame(actions: UIAction[], frame: UIFrame): UIAction[] {
  const frameTime = new Date(frame.timestamp).getTime();
  return actions.filter((action) => {
    const actionTime = new Date(action.timestamp).getTime();
    return Math.abs(actionTime - frameTime) <= 60_000;
  });
}

export async function summarizeTrajectory(
  input: TrajectoryInput,
  options: SummarizeOptions,
): Promise<StepSummary[]> {
  const prompt = await loadPromptTemplate(
    options.promptPath,
    options.promptId,
    options.promptVersion,
  );
  const client = new OpenAICompatibleClient(options.baseUrl, options.apiKey);

  const summaries: StepSummary[] = [];

  for (let index = 0; index < input.frames.length; index += 1) {
    const window = buildWindow(input.frames, index);
    const contextActions = actionsForFrame(input.actions, window.current);
    const promptText = fillTemplate(prompt.content, {
      previousFrame: JSON.stringify(window.previous ?? null, null, 2),
      currentFrame: JSON.stringify(window.current, null, 2),
      nextFrame: JSON.stringify(window.next ?? null, null, 2),
      actions: JSON.stringify(contextActions, null, 2),
    });

    const response = await client.complete(promptText, {
      model: options.modelId,
      maxTokens: options.maxTokens ?? 700,
      temperature: 0.1,
    });

    const parsed = safeJsonParse<StepSummary>(response);
    const summary: StepSummary = {
      ...parsed,
      schemaVersion: parsed.schemaVersion ?? 'v1',
      locale: parsed.locale ?? window.current.locale,
      provenance: {
        ...parsed.provenance,
        modelId: options.modelId,
        promptHash: prompt.sha256,
        promptId: options.promptId,
        promptVersion: options.promptVersion,
        window: {
          previousFrameId: window.previous?.id,
          currentFrameId: window.current.id,
          nextFrameId: window.next?.id,
        },
        generatedAt: new Date().toISOString(),
      },
    };

    summaries.push(summary);
  }

  return summaries;
}

export async function loadTrajectory(inputPath: string): Promise<TrajectoryInput> {
  const payload = await readFile(path.resolve(inputPath), 'utf8');
  return safeJsonParse<TrajectoryInput>(payload);
}
