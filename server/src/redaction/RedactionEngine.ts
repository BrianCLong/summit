
import { RedactionRule, RedactionResult, RedactionMapEntry } from './types';

export class RedactionEngine {
  private rules: RedactionRule[];

  constructor(rules: RedactionRule[] = []) {
    this.rules = rules;
  }

  apply(text: string): RedactionResult {
    let redactedText = text;
    const map: RedactionMapEntry[] = [];

    // Process rules sequentially.
    // Note: A real robust implementation would handle overlapping matches carefully.
    // For this additive task, we use a simple sequential replacement strategy where we track offsets.
    // However, tracking offsets after modification is tricky.
    // A better approach is to find all matches in the original text first, sort by position, and then reconstruct.

    const matches: { start: number; end: number; rule: RedactionRule }[] = [];

    for (const rule of this.rules) {
      if (rule.type === 'regex' && rule.pattern) {
        let match;
        // Reset lastIndex if global
        const regex = new RegExp(rule.pattern, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            rule: rule
          });
        }
      } else if (rule.type === 'pii_category') {
        // Simple built-in patterns for common PII
        let pattern: RegExp | null = null;
        if (rule.category === 'EMAIL') {
           pattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        } else if (rule.category === 'PHONE') {
           pattern = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
        }

        if (pattern) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              rule: rule
            });
          }
        }
      }
    }

    // Sort matches by start position desc to simplify replacement or asc for map?
    // Sorting by start position
    matches.sort((a, b) => a.start - b.start);

    // Filter overlapping matches (simple greedy: take first one that starts, discard overlaps)
    const uniqueMatches: typeof matches = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        uniqueMatches.push(m);
        lastEnd = m.end;
      }
    }

    // Construct result
    let currentIdx = 0;
    let resultBuilder = "";

    for (const m of uniqueMatches) {
        // Append text before match
        resultBuilder += text.substring(currentIdx, m.start);

        // Append replacement
        resultBuilder += m.rule.replacement;

        // Add to map
        map.push({
            start: m.start,
            end: m.end,
            originalText: text.substring(m.start, m.end),
            ruleId: m.rule.id,
            justification: m.rule.description
        });

        currentIdx = m.end;
    }

    // Append remaining
    resultBuilder += text.substring(currentIdx);

    return {
      redactedText: resultBuilder,
      map: map
    };
  }
}
