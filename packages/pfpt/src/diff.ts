import { DiffChange, DiffOptions, DiffResult } from './types.js';
import {
  hasSemanticValue,
  mergeConsecutive,
  tokenize,
  tryNormalizeJson,
  HASH_PREFIX,
} from './utils.js';
import { redactSensitive } from './redaction.js';
import { buildRiskSummary } from './risk.js';
import { renderPrompt } from './prompt.js';

interface LcsCell {
  length: number;
  direction: 'diag' | 'up' | 'left' | null;
}

function buildLcsMatrix(previous: string[], next: string[]): LcsCell[][] {
  const rows = previous.length + 1;
  const cols = next.length + 1;
  const matrix: LcsCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ length: 0, direction: null } as LcsCell)),
  );

  for (let i = previous.length - 1; i >= 0; i -= 1) {
    for (let j = next.length - 1; j >= 0; j -= 1) {
      if (previous[i] === next[j]) {
        matrix[i][j] = {
          length: matrix[i + 1][j + 1].length + 1,
          direction: 'diag',
        };
      } else if (matrix[i + 1][j].length >= matrix[i][j + 1].length) {
        matrix[i][j] = { length: matrix[i + 1][j].length, direction: 'up' };
      } else {
        matrix[i][j] = { length: matrix[i][j + 1].length, direction: 'left' };
      }
    }
  }

  return matrix;
}

function backtrackDiff(previous: string[], next: string[], matrix: LcsCell[][]): DiffChange[] {
  const changes: DiffChange[] = [];
  let i = 0;
  let j = 0;

  while (i < previous.length && j < next.length) {
    const cell = matrix[i][j];
    if (cell.direction === 'diag') {
      changes.push({ type: 'equal', value: previous[i] });
      i += 1;
      j += 1;
    } else if (cell.direction === 'up') {
      changes.push({ type: 'remove', value: previous[i] });
      i += 1;
    } else if (cell.direction === 'left') {
      changes.push({ type: 'add', value: next[j] });
      j += 1;
    } else {
      break;
    }
  }

  while (i < previous.length) {
    changes.push({ type: 'remove', value: previous[i] });
    i += 1;
  }

  while (j < next.length) {
    changes.push({ type: 'add', value: next[j] });
    j += 1;
  }

  return mergeConsecutive(changes);
}

function aggregateSemanticChanges(changes: DiffChange[]): { total: number; semantic: number } {
  let semantic = 0;
  let total = 0;

  for (const change of changes) {
    if (change.type === 'equal') {
      continue;
    }

    total += 1;
    if (hasSemanticValue(change.value)) {
      semantic += 1;
    }
  }

  return { total, semantic };
}

export function computeDiff(previousInput: unknown, nextInput: unknown, options: DiffOptions = {}): DiffResult {
  const previous = renderPrompt(previousInput);
  const next = renderPrompt(nextInput);

  const redactedPrevious = redactSensitive(previous, options);
  const redactedNext = redactSensitive(next, options);

  const normalizedPrevious = tryNormalizeJson(redactedPrevious.sanitized);
  const normalizedNext = tryNormalizeJson(redactedNext.sanitized);

  const previousTokens = tokenize(normalizedPrevious, options.treatNewlinesAsTokens);
  const nextTokens = tokenize(normalizedNext, options.treatNewlinesAsTokens);

  const matrix = buildLcsMatrix(previousTokens, nextTokens);
  const changes = backtrackDiff(previousTokens, nextTokens, matrix);
  const { total, semantic } = aggregateSemanticChanges(changes);
  const risk = buildRiskSummary(changes, [...redactedPrevious.redactions, ...redactedNext.redactions]);

  return {
    sanitizedPrevious: normalizedPrevious,
    sanitizedNext: normalizedNext,
    changes,
    redactions: [...redactedPrevious.redactions, ...redactedNext.redactions],
    summary: {
      totalChanges: total,
      semanticChanges: semantic,
      riskLevel: risk.level,
      annotations: risk.annotations,
    },
  };
}

export function hasHashedTokens(diff: DiffResult): boolean {
  return diff.changes.some((change) => change.value.includes(HASH_PREFIX));
}
