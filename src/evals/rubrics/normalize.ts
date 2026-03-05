import crypto from 'crypto';
import { AtomicRubric, RubricComposite } from './types.js';

export function normalizeCriterion(instruction: string, criterion: string): AtomicRubric {
  const hash = crypto.createHash('sha256').update(`${instruction}:${criterion}`).digest('hex').substring(0, 8);
  return {
    id: `ARUB-${hash}`,
    criterion: criterion.trim(),
    weight: 1.0, // default
  };
}

export function buildCompositeRubric(instruction: string, criteria: string[]): RubricComposite {
  const hash = crypto.createHash('sha256').update(instruction).digest('hex').substring(0, 8);
  return {
    id: `CRUB-${hash}`,
    instruction,
    atomicCriteria: criteria.map(c => normalizeCriterion(instruction, c))
  };
}
