/**
 * Graph versioning and temporal query support
 */

import { GraphVersion, GraphChange, TemporalQuery } from '../types.js';
import { Logger } from '../utils/Logger.js';

export class VersionManager {
  private versions: Map<number, GraphVersion>;
  private currentVersion: number;
  private changes: GraphChange[];
  private logger: Logger;
  private snapshotInterval: number;

  constructor(snapshotInterval: number = 100) {
    this.versions = new Map();
    this.currentVersion = 0;
    this.changes = [];
    this.logger = new Logger('VersionManager');
    this.snapshotInterval = snapshotInterval;

    // Create initial version
    this.createVersion('Initial version');
  }

  /**
   * Record a change to the graph
   */
  recordChange(change: GraphChange): void {
    this.changes.push(change);
    this.logger.debug(`Recorded change: ${change.type} on ${change.target}`);

    // Create snapshot if needed
    if (this.changes.length >= this.snapshotInterval) {
      this.createSnapshot();
    }
  }

  /**
   * Create a new version
   */
  createVersion(message: string, author?: string): number {
    const version: GraphVersion = {
      version: ++this.currentVersion,
      timestamp: new Date(),
      changes: [...this.changes],
      author,
      message
    };

    this.versions.set(this.currentVersion, version);
    this.changes = [];

    this.logger.info(`Created version ${this.currentVersion}: ${message}`);
    return this.currentVersion;
  }

  /**
   * Create a snapshot of the current state
   */
  private createSnapshot(): void {
    const version = this.versions.get(this.currentVersion);
    if (version) {
      // In a real implementation, this would serialize the graph state
      version.snapshot = JSON.stringify({
        timestamp: new Date(),
        changeCount: this.changes.length
      });
      this.changes = [];
    }
  }

  /**
   * Get a specific version
   */
  getVersion(versionNumber: number): GraphVersion | undefined {
    return this.versions.get(versionNumber);
  }

  /**
   * Get the current version number
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Get all versions
   */
  getAllVersions(): GraphVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => a.version - b.version);
  }

  /**
   * Get version at a specific timestamp
   */
  getVersionAtTime(timestamp: Date): GraphVersion | undefined {
    const versions = this.getAllVersions();

    // Find the last version before or at the timestamp
    for (let i = versions.length - 1; i >= 0; i--) {
      if (versions[i].timestamp <= timestamp) {
        return versions[i];
      }
    }

    return undefined;
  }

  /**
   * Get changes between two versions
   */
  getChangesBetween(fromVersion: number, toVersion: number): GraphChange[] {
    const changes: GraphChange[] = [];

    for (let v = fromVersion + 1; v <= toVersion; v++) {
      const version = this.versions.get(v);
      if (version) {
        changes.push(...version.changes);
      }
    }

    return changes;
  }

  /**
   * Get changes in a time range
   */
  getChangesInTimeRange(startTime: Date, endTime: Date): GraphChange[] {
    const allChanges: GraphChange[] = [];

    this.versions.forEach(version => {
      if (version.timestamp >= startTime && version.timestamp <= endTime) {
        allChanges.push(...version.changes);
      }
    });

    // Add uncommitted changes if they're in range
    const uncommittedInRange = this.changes.filter(
      c => c.timestamp >= startTime && c.timestamp <= endTime
    );
    allChanges.push(...uncommittedInRange);

    return allChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Revert to a specific version
   */
  async revertToVersion(versionNumber: number): Promise<void> {
    const targetVersion = this.versions.get(versionNumber);
    if (!targetVersion) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    // In a real implementation, this would apply the reverse changes
    this.logger.info(`Reverting to version ${versionNumber}`);

    // Create a new version for the revert
    this.createVersion(`Reverted to version ${versionNumber}`);
  }

  /**
   * Query changes by filter
   */
  queryChanges(filter: {
    type?: GraphChange['type'][];
    target?: string;
    startTime?: Date;
    endTime?: Date;
  }): GraphChange[] {
    let allChanges: GraphChange[] = [];

    // Get changes from all versions
    this.versions.forEach(version => {
      allChanges.push(...version.changes);
    });

    // Add uncommitted changes
    allChanges.push(...this.changes);

    // Apply filters
    if (filter.type) {
      allChanges = allChanges.filter(c => filter.type!.includes(c.type));
    }

    if (filter.target) {
      allChanges = allChanges.filter(c => c.target === filter.target);
    }

    if (filter.startTime) {
      allChanges = allChanges.filter(c => c.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      allChanges = allChanges.filter(c => c.timestamp <= filter.endTime!);
    }

    return allChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get statistics about versions
   */
  getStatistics(): {
    versionCount: number;
    totalChanges: number;
    oldestVersion?: Date;
    newestVersion?: Date;
    changeTypes: Record<string, number>;
  } {
    const allVersions = this.getAllVersions();
    let totalChanges = 0;
    const changeTypes: Record<string, number> = {};

    this.versions.forEach(version => {
      totalChanges += version.changes.length;
      version.changes.forEach(change => {
        changeTypes[change.type] = (changeTypes[change.type] || 0) + 1;
      });
    });

    return {
      versionCount: this.versions.size,
      totalChanges,
      oldestVersion: allVersions[0]?.timestamp,
      newestVersion: allVersions[allVersions.length - 1]?.timestamp,
      changeTypes
    };
  }

  /**
   * Compact old versions (garbage collection)
   */
  compactVersions(keepVersions: number = 10): void {
    const allVersions = this.getAllVersions();
    const versionsToDelete = allVersions.slice(0, -keepVersions);

    versionsToDelete.forEach(version => {
      this.versions.delete(version.version);
    });

    this.logger.info(`Compacted ${versionsToDelete.length} old versions`);
  }

  /**
   * Export version history
   */
  exportHistory(): string {
    const history = {
      currentVersion: this.currentVersion,
      versions: this.getAllVersions(),
      uncommittedChanges: this.changes
    };

    return JSON.stringify(history, null, 2);
  }

  /**
   * Import version history
   */
  importHistory(historyJson: string): void {
    const history = JSON.parse(historyJson);

    this.currentVersion = history.currentVersion;
    this.changes = history.uncommittedChanges || [];
    this.versions.clear();

    history.versions.forEach((version: GraphVersion) => {
      // Convert date strings back to Date objects
      version.timestamp = new Date(version.timestamp);
      version.changes.forEach(change => {
        change.timestamp = new Date(change.timestamp);
      });
      this.versions.set(version.version, version);
    });

    this.logger.info('Imported version history');
  }
}
