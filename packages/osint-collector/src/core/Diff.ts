export interface DiffResult {
  added: number;
  removed: number;
  changed: boolean;
  summary: string;
}

export class DiffEngine {
  /**
   * Computes a simple line-based diff between two snapshots.
   */
  public static compute(oldContent: string, newContent: string): DiffResult {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let added = 0;
    let removed = 0;

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    newLines.forEach(line => {
      if (!oldSet.has(line)) added++;
    });

    oldLines.forEach(line => {
      if (!newSet.has(line)) removed++;
    });

    return {
      added,
      removed,
      changed: added > 0 || removed > 0,
      summary: `${added} lines added, ${removed} lines removed`,
    };
  }
}
