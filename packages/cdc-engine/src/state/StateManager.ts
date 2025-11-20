/**
 * State manager for CDC
 */

/**
 * Manages CDC state and watermarks
 */
export class StateManager {
  private watermarks: Map<string, any> = new Map();
  private snapshots: Map<string, any> = new Map();

  /**
   * Save watermark
   */
  async saveWatermark(watermark: any): Promise<void> {
    this.watermarks.set('current', watermark);
  }

  /**
   * Get watermark
   */
  async getWatermark(): Promise<any> {
    return this.watermarks.get('current');
  }

  /**
   * Save snapshot
   */
  async saveSnapshot(id: string, snapshot: any): Promise<void> {
    this.snapshots.set(id, snapshot);
  }

  /**
   * Get snapshot
   */
  async getSnapshot(id: string): Promise<any> {
    return this.snapshots.get(id);
  }

  /**
   * Clear state
   */
  async clear(): Promise<void> {
    this.watermarks.clear();
    this.snapshots.clear();
  }
}
