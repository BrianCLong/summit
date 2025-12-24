// Minimal, line-oriented DSL example
// permit role:DisclosureApprover export where license != restricted
export type Rule = { action: 'permit' | 'deny'; role: string; resource: string; condition?: string };

export function parse(src: string): Rule[] {
  return src
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^([a-z]+)\s+role:([^\s]+)\s+([a-z]+)\s+where\s+(.+)$/.exec(line);
      if (!m) {
        throw new Error(`syntax_error:${line}`);
      }
      return { action: m[1] as Rule['action'], role: m[2], resource: m[3], condition: m[4] };
    });
}
