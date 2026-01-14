import { SeededRng } from './rng';
import { CandidateArtifact, CandidateOperator, PromptMetadata } from './types';

export interface LlmRouter {
  generate(input: {
    system: string;
    prompt: string;
    seed: number;
    temperature: number;
    metadata: Record<string, unknown>;
  }): Promise<string>;
}

export interface PromptLibrary {
  load(prompt: PromptMetadata): string;
}

export class LlmCandidateOperator<TCandidate> implements CandidateOperator<TCandidate> {
  readonly id: string;

  constructor(
    id: string,
    private readonly router: LlmRouter,
    private readonly prompts: PromptLibrary,
    private readonly parse: (output: string) => TCandidate,
    private readonly prompt: PromptMetadata,
    private readonly systemPrompt: PromptMetadata,
    private readonly temperature = 0.2,
  ) {
    this.id = id;
  }

  async generate(parent: CandidateArtifact<TCandidate> | undefined, rng: SeededRng): Promise<TCandidate> {
    const system = this.prompts.load(this.systemPrompt);
    const userPrompt = this.prompts.load(this.prompt);
    const output = await this.router.generate({
      system,
      prompt: parent ? `${userPrompt}\n\nParent:\n${JSON.stringify(parent.content)}` : userPrompt,
      seed: rng.stateSnapshot().seed,
      temperature: this.temperature,
      metadata: { promptId: this.prompt.id, promptVersion: this.prompt.version },
    });
    return this.parse(output);
  }
}

export class NoopPromptLibrary implements PromptLibrary {
  load(prompt: PromptMetadata): string {
    return `Prompt ${prompt.id}@${prompt.version} not configured.`;
  }
}
