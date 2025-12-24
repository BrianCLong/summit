import { Rule } from './dsl';

export function toOPA(rules: Rule[]): string {
  const lines = ['package export.authz', 'default allow = false'];
  let idx = 0;
  for (const r of rules) {
    if (r.action === 'permit') {
      lines.push(`allow { input.user.roles[_] == "${r.role}" } # rule${idx++}`);
    }
  }
  return lines.join('\n');
}
