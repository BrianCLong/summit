export class TaggingService {
  async getUntaggedResources(options: { provider?: string }) {
    return [];
  }

  async enforceTagging(options: { provider?: string; dryRun?: boolean }) {
    return { success: true, taggedCount: 0 };
  }

  async scanForUntaggedResources() {
    // Scan implementation
  }
}
