import { LawEngine } from './LawEngine.js';
import { EpistemicLaws } from './constitution.js';
import { Context, ValidationResult } from './types.js';

// Initialize the engine with Constitutional Laws
const engine = LawEngine.getInstance();
EpistemicLaws.forEach(law => engine.registerLaw(law));

export async function validateAction(context: Context): Promise<ValidationResult> {
  return engine.evaluate(context);
}

export function registerLaw(law: any) {
    engine.registerLaw(law);
}
