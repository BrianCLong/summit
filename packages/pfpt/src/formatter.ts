import { DiffChange, DiffResult } from './types.js';

function formatChange(change: DiffChange): string {
  const prefix = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' ';
  return change.value
    .split(/\r?\n/)
    .map((line, index, lines) => {
      const value = line === '' && index === lines.length - 1 ? '' : line;
      return `${prefix} ${value}`;
    })
    .join('\n');
}

export function formatCiReport(result: DiffResult): string {
  const lines: string[] = [];
  lines.push('PFPT Semantic Diff');
  lines.push('==================');
  lines.push('Summary:');
  lines.push(`  Total changes: ${result.summary.totalChanges}`);
  lines.push(`  Semantic changes: ${result.summary.semanticChanges}`);
  lines.push(`  Risk level: ${result.summary.riskLevel}`);
  lines.push('Annotations:');
  for (const annotation of result.summary.annotations) {
    lines.push(`  - [${annotation.level}] ${annotation.code}: ${annotation.message}`);
  }
  lines.push('');
  lines.push('Diff:');
  for (const change of result.changes) {
    if (change.type === 'equal') {
      continue;
    }
    lines.push(formatChange(change));
  }
  if (result.changes.every((change) => change.type === 'equal')) {
    lines.push('  (no changes)');
  }
  return lines.join('\n');
}
