// server/src/nl2cypher/index.ts
import { parse, ParseResult } from './parser';
import { generateCypher } from './cypherGenerator';
import { estimateCost } from './costEstimator';

export interface TranslationResult {
  ast: ParseResult;
  cypher: string;
  rationale: { phrase: string; clause: string }[];
  estimatedCost: number;
}

export async function nl2cypher(prompt: string): Promise<TranslationResult> {
  const ast = parse(prompt);
  const cypher = generateCypher(ast);
  const estimatedCost = await estimateCost(ast);
  const rationale = [{ phrase: 'N/A', clause: 'N/A' }]; // Placeholder

  return { ast, cypher, estimatedCost, rationale };
}
