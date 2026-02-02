import { CRITIC_PROMPT, REFINER_PROMPT } from './prompts';

export interface Critique {
  strengths: string[];
  weaknesses: string[];
  score: number;
  recommendations: string;
}

export interface ValidationResult {
  refined: string;
  critiqueRaw: string;
  critiqueParsed?: Critique;
  wasRefined: boolean;
}

// Minimal interface for an LLM runner to avoid circular dependency on core Engine
export interface LLMRunner {
  run(prompt: string, systemPrompt?: string): Promise<string>;
}

export class DebateValidator {
  constructor(private runner: LLMRunner) {}

  async validateAndRefine(originalSolution: string): Promise<ValidationResult> {
    // 1. Critic
    const critiqueRaw = await this.runner.run(
      `Critique this solution:\n${originalSolution}`,
      CRITIC_PROMPT
    );

    let critiqueParsed: Critique | undefined;
    try {
      // Try to parse JSON. Handle potential markdown code blocks ```json ... ```
      const jsonMatch = critiqueRaw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : critiqueRaw;
      critiqueParsed = JSON.parse(jsonStr) as Critique;
    } catch (e) {
      // Failed to parse, treat as raw critique
      console.warn("Failed to parse critique JSON", e);
    }

    // 2. Decide if refinement is needed
    // If score is high enough (e.g. > 0.9), skip refinement?
    // MWS says "optionally runs a critic→refiner validation loop for medium/hard tasks".
    // Let's assume we always refine if we ran the critic, unless score is perfect.
    if (critiqueParsed && critiqueParsed.score >= 0.95) {
      return {
        refined: originalSolution,
        critiqueRaw,
        critiqueParsed,
        wasRefined: false
      };
    }

    // 3. Refiner
    const refinerInput = REFINER_PROMPT
      .replace('{{original}}', originalSolution)
      .replace('{{critique}}', critiqueRaw);

    const refined = await this.runner.run(refinerInput);

    return {
      refined,
      critiqueRaw,
      critiqueParsed,
      wasRefined: true
    };
  }
}
