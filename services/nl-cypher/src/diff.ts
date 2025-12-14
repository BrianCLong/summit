export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export function diffQueries(before: string, after: string): DiffLine[] {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const diff: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const prev = beforeLines[i];
    const next = afterLines[i];
    if (prev === next) {
      diff.push({ type: 'unchanged', text: prev ?? '' });
    } else {
      if (prev !== undefined) diff.push({ type: 'removed', text: prev });
      if (next !== undefined) diff.push({ type: 'added', text: next });
    }
  }

  return diff;
}
