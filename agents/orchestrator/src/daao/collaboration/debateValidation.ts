import { CRITIC_PROMPT, REFINER_PROMPT } from './prompts.js';

export interface ValidationResult {
  refined: string;
  critiqueRaw: string;
  parsedCritique?: {
    issues: string[];
    score: number;
    safe: boolean;
  };
  improved: boolean;
}

export interface LLMRunner {
  run(prompt: string): Promise<string>;
}

export class DebateValidator {
  constructor(private runner: LLMRunner) {}

  async validate(draft: string): Promise<ValidationResult> {
    // 1. Critic Step
    const criticInput = `${CRITIC_PROMPT}\n\nDraft:\n${draft}`;
    const critiqueRaw = await this.runner.run(criticInput);

    let parsedCritique: any;
    try {
      // Try to find JSON block if mixed with text
      const jsonMatch = critiqueRaw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : critiqueRaw;
      parsedCritique = JSON.parse(jsonStr);
    } catch (e) {
      // Failed to parse, treat as unstructured
    }

    // 2. Refine Step (if needed or always run)
    // For MWS, let's always run if score < 0.9 or if unparseable
    const score = parsedCritique?.score ?? 0;

    if (score >= 0.9 && parsedCritique?.safe) {
      return {
        refined: draft,
        critiqueRaw,
        parsedCritique,
        improved: false
      };
    }

    const refinerInput = REFINER_PROMPT
      .replace('{{draft}}', draft)
      .replace('{{critique}}', critiqueRaw);

    const refined = await this.runner.run(refinerInput);

    return {
      refined,
      critiqueRaw,
      parsedCritique,
      improved: true
    };
  }
}
