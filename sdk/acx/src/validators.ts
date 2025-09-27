import { PolicyTemplatePack } from './types.js';

export interface LintFinding {
  locale: string;
  message: string;
  pattern: string;
}

export class DarkPatternLinter {
  constructor(private readonly disallowedPatterns: string[]) {}

  public lintPack(pack: PolicyTemplatePack): LintFinding[] {
    return Object.values(pack.locales).flatMap((locale) => this.lintLocale(locale.locale, locale));
  }

  private lintLocale(locale: string, copy: unknown): LintFinding[] {
    const findings: LintFinding[] = [];
    const inspect = (value: unknown): void => {
      if (typeof value === 'string') {
        this.disallowedPatterns.forEach((pattern) => {
          if (value.toLowerCase().includes(pattern.toLowerCase())) {
            findings.push({
              locale,
              message: `Found disallowed pattern "${pattern}" in text: ${value}`,
              pattern
            });
          }
        });
      } else if (Array.isArray(value)) {
        value.forEach(inspect);
      } else if (value && typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach(inspect);
      }
    };

    inspect(copy);
    return findings;
  }
}
