/**
 * Change Detector - Detects changes in web pages
 */

import { createHash } from 'crypto';
import type { ChangeDetection } from '../types/index.js';

export class ChangeDetector {
  private checksums: Map<string, string> = new Map();
  private previousContent: Map<string, string> = new Map();

  /**
   * Check if a page has changed
   */
  async detectChanges(url: string, content: string): Promise<ChangeDetection> {
    const currentChecksum = this.computeChecksum(content);
    const previousChecksum = this.checksums.get(url);

    if (!previousChecksum) {
      // First time checking this URL
      this.checksums.set(url, currentChecksum);
      this.previousContent.set(url, content);

      return {
        url,
        previousChecksum: '',
        currentChecksum,
        changed: false,
        changedAt: new Date()
      };
    }

    const changed = currentChecksum !== previousChecksum;

    const result: ChangeDetection = {
      url,
      previousChecksum,
      currentChecksum,
      changed,
      changedAt: new Date()
    };

    if (changed) {
      const previousText = this.previousContent.get(url) || '';
      result.diff = this.computeDiff(previousText, content);

      // Update stored values
      this.checksums.set(url, currentChecksum);
      this.previousContent.set(url, content);
    }

    return result;
  }

  /**
   * Compute checksum of content
   */
  private computeChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compute diff between old and new content
   */
  private computeDiff(
    oldContent: string,
    newContent: string
  ): { added: string[]; removed: string[]; modified: string[] } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (!oldLine && newLine) {
        added.push(newLine);
      } else if (oldLine && !newLine) {
        removed.push(oldLine);
      } else if (oldLine !== newLine) {
        modified.push(`- ${oldLine}\n+ ${newLine}`);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Clear stored checksums and content
   */
  clear(): void {
    this.checksums.clear();
    this.previousContent.clear();
  }

  /**
   * Remove specific URL from tracking
   */
  remove(url: string): void {
    this.checksums.delete(url);
    this.previousContent.delete(url);
  }

  /**
   * Get tracked URLs
   */
  getTrackedUrls(): string[] {
    return Array.from(this.checksums.keys());
  }
}
