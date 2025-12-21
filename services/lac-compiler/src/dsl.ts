export type Parsed = { command: string | null; raw: string };

export function parse(input: string): Parsed {
  const trimmed = input.trim();
  if (!trimmed) {
    return { command: null, raw: input };
  }
  const match = /^([a-z]+)/i.exec(trimmed);
  return { command: match ? match[1].toLowerCase() : null, raw: input };
}
