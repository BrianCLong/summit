"use strict";
/**
 * Change Detector - Detects changes in web pages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeDetector = void 0;
const crypto_1 = require("crypto");
class ChangeDetector {
    checksums = new Map();
    previousContent = new Map();
    /**
     * Check if a page has changed
     */
    async detectChanges(url, content) {
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
        const result = {
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
    computeChecksum(content) {
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    /**
     * Compute diff between old and new content
     */
    computeDiff(oldContent, newContent) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const added = [];
        const removed = [];
        const modified = [];
        // Simple line-by-line diff
        const maxLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (!oldLine && newLine) {
                added.push(newLine);
            }
            else if (oldLine && !newLine) {
                removed.push(oldLine);
            }
            else if (oldLine !== newLine) {
                modified.push(`- ${oldLine}\n+ ${newLine}`);
            }
        }
        return { added, removed, modified };
    }
    /**
     * Clear stored checksums and content
     */
    clear() {
        this.checksums.clear();
        this.previousContent.clear();
    }
    /**
     * Remove specific URL from tracking
     */
    remove(url) {
        this.checksums.delete(url);
        this.previousContent.delete(url);
    }
    /**
     * Get tracked URLs
     */
    getTrackedUrls() {
        return Array.from(this.checksums.keys());
    }
}
exports.ChangeDetector = ChangeDetector;
