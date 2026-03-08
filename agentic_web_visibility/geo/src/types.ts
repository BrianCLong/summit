export interface NormalizedAnswer {
  engine: string;
  promptId: string;
  answerText: string;
  citations: string[];
  raw: unknown;
}

export interface EngineRunner {
  id: string;
  run(promptText: string): Promise<NormalizedAnswer>;
}
