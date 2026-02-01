import { createHash } from 'crypto';

export interface Snapshot {
  id: string;
  content: string;
  timestamp: string;
  vantageId: string;
  assetId: string;
  hash: string;
}

export class SnapshotManager {
  /**
   * Captures a content snapshot and returns a content-addressed Snapshot object.
   */
  public static capture(content: string, assetId: string, vantageId: string): Snapshot {
    const timestamp = new Date().toISOString();
    const hash = createHash('sha256').update(content).digest('hex');
    const id = `snap-${hash.substring(0, 12)}-${Date.now()}`;

    return {
      id,
      content,
      timestamp,
      vantageId,
      assetId,
      hash,
    };
  }

  /**
   * Canonicalizes content to ensure deterministic hashing and diffing.
   */
  public static canonicalize(content: string): string {
    // Simple canonicalization: trim, remove multiple spaces, sort lines if it's structured text
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }
}
