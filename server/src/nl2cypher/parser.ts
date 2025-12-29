// server/src/nl2cypher/parser.ts
import { Parser } from 'nearley';
import grammar from './grammar.js';

export interface ParseResult {
  type: 'find' | 'count';
  label: string;
  filter: { property: string; value: string } | null;
}

export function parse(input: string): ParseResult {
  const parser = new Parser(grammar);
  parser.feed(input.trim());

  if (parser.results.length > 1) {
    console.warn('Ambiguous grammar detected!', parser.results);
  }

  if (parser.results.length === 0) {
    throw new Error('Invalid query');
  }

  return parser.results[0][0];
}
