
export interface ForkTask {
  name: string;
  payload?: any;
  config?: any;
  kind?: string;
}

export class ForkDetector {
  private static FORK_KEYWORDS = [
    'decide', 'choose', 'determine', 'classify', 'if', 'branch',
    'select', 'evaluate', 'judge', 'authorize', 'reason', 'plan',
    'review', 'check', 'verify', 'analyze', 'disambiguate', 'gateway',
    'approve', 'reject', 'confirm'
  ];

  private static MECHANICAL_KEYWORDS = [
    'extract', 'parse', 'format', 'transform', 'upload', 'download',
    'save', 'store', 'notify', 'email', 'log', 'report', 'ingest',
    'read', 'write', 'fetch', 'send', 'backup', 'archive', 'clean'
  ];

  /**
   * Calculates the entropy/uncertainty score of a task.
   * Higher score means higher probability of being a "fork" (decision point).
   * Range: 0 to 1.
   */
  static calculateEntropy(task: ForkTask): number {
    let score = 0.5; // Base entropy

    const text = (
      (task.name || '') + ' ' +
      (task.kind || '') + ' ' +
      JSON.stringify(task.payload || {}) + ' ' +
      JSON.stringify(task.config || {})
    ).toLowerCase();

    // Check for Fork Keywords (Increase Entropy)
    let forkHits = 0;
    for (const word of this.FORK_KEYWORDS) {
      if (text.includes(word)) {
        forkHits++;
      }
    }
    // Diminishing returns for hits: 1 hit -> ~0.18 boost. 5 hits -> ~0.31 boost.
    score += (1 - Math.exp(-0.2 * forkHits)) * 0.5;

    // Check for Mechanical Keywords (Decrease Entropy)
    let mechHits = 0;
    for (const word of this.MECHANICAL_KEYWORDS) {
      if (text.includes(word)) {
        mechHits++;
      }
    }
    score -= (1 - Math.exp(-0.2 * mechHits)) * 0.4;

    // Clamp between 0.01 and 0.99
    return Math.max(0.01, Math.min(0.99, score));
  }

  /**
   * Sorts tasks by entropy descending (Highest Entropy First).
   */
  static prioritize<T extends ForkTask>(tasks: T[]): T[] {
    return [...tasks].sort((a, b) => {
      const entropyA = this.calculateEntropy(a);
      const entropyB = this.calculateEntropy(b);
      return entropyB - entropyA;
    });
  }
}
