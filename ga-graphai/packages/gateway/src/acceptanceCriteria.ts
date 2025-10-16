import { AcceptanceCriteria } from '@ga-graphai/common-types';

import { normalizeWhitespace } from './utils.js';

function buildId(index: number): string {
  return `AC-${index + 1}`;
}

function determineVerifier(statement: string): AcceptanceCriteria['verify'] {
  if (/test|spec/i.test(statement)) {
    return 'test';
  }
  if (/command|script/i.test(statement)) {
    return 'cmd';
  }
  if (/assert|validate/i.test(statement)) {
    return 'assert';
  }
  return 'manual';
}

function determineMetric(statement: string): string {
  if (/latency/i.test(statement)) {
    return 'latency-p95-ms';
  }
  if (/coverage/i.test(statement)) {
    return 'coverage';
  }
  if (/error/i.test(statement)) {
    return 'error-rate';
  }
  return 'qualitative';
}

function determineThreshold(statement: string): string {
  const match = statement.match(/(\d+(?:\.\d+)?)%/);
  if (match) {
    return `${match[1]}%`;
  }
  const msMatch = statement.match(/(\d{2,5})\s*ms/);
  if (msMatch) {
    return `${msMatch[1]}ms`;
  }
  return '1.0';
}

export interface SynthesisResult {
  criteria: AcceptanceCriteria[];
  missingSignals: string[];
}

export class AcceptanceCriteriaSynthesizer {
  generate(source: string, hints: string[] = []): SynthesisResult {
    const statements = this.extractStatements(source, hints);
    const criteria = statements.map((statement, index) => ({
      id: buildId(index),
      statement,
      verify: determineVerifier(statement),
      metric: determineMetric(statement),
      threshold: determineThreshold(statement),
    }));
    const missingSignals =
      criteria.length === 0 ? ['no actionable statements found'] : [];
    return { criteria, missingSignals };
  }

  private extractStatements(source: string, hints: string[]): string[] {
    const sentences = source
      .split(/\n|\.\s+/)
      .map((sentence) => normalizeWhitespace(sentence))
      .filter(Boolean);

    const filtered = sentences.filter((sentence) => {
      return /must|should|ensure|verify|p95|<=|>=|pass/i.test(sentence);
    });

    const hintStatements = hints
      .map((hint) => normalizeWhitespace(hint))
      .filter((hint) => /must|should|ensure|verify/.test(hint));

    const combined = [...filtered, ...hintStatements];
    const seen = new Set<string>();
    return combined.filter((statement) => {
      const key = statement.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export class AcceptanceCriteriaVerifier {
  verify(
    criteria: AcceptanceCriteria[],
    evidence: Record<string, unknown>,
  ): boolean {
    return criteria.every((criterion) => {
      const value = evidence[criterion.id];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        const numericThreshold = Number.parseFloat(
          criterion.threshold.replace(/[^0-9.]/g, ''),
        );
        if (Number.isNaN(numericThreshold)) {
          return value > 0;
        }
        if (/ms$/.test(criterion.threshold.toLowerCase())) {
          return value <= numericThreshold;
        }
        return value >= numericThreshold;
      }
      return Boolean(value);
    });
  }
}
