export interface ParseResult { tokens: string[] }

export function parse(input: string): ParseResult {
  const sanitized = (input || '').toString();
  const tokens = sanitized.split(/\s+/).filter(Boolean);
  if (tokens.length && !/^[a-z]/i.test(tokens[0])) {
    throw new Error('Invalid DSL start');
  }
  return { tokens };
}
