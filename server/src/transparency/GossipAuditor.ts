export class GossipAuditor {
  constructor(
    private fetcher: {
      getSTH: () => Promise<{ size: number; root: string }>;
      getRange: (from: number, to: number) => Promise<string[]>;
    },
    private log: { alert: (msg: string) => void },
  ) {}

  /**
   * Performs a single audit of the transparency log.
   * Fetches the Signed Tree Head (STH) and verifies the consistency of the log entries.
   *
   * @returns An object indicating success or failure, and the log size if successful.
   */
  async auditOnce() {
    const sth = await this.fetcher.getSTH();
    const range = await this.fetcher.getRange(0, sth.size);
    const recomputed = range.join('');
    if (recomputed !== sth.root) {
      this.log.alert('transparency_log_mismatch');
      return { ok: false };
    }
    return { ok: true, size: sth.size };
  }
}
