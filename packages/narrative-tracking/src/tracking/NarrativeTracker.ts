/**
 * Narrative tracking over time
 * Monitors narrative evolution, prevalence, and spread
 */

import type {
  Narrative,
  NarrativeEvolution,
  NarrativeVersion,
  DivergencePoint,
  ConvergencePoint,
} from '../extraction/types.js';

export class NarrativeTracker {
  private narratives: Map<string, Narrative> = new Map();
  private evolutions: Map<string, NarrativeEvolution> = new Map();

  trackNarrative(narrative: Narrative, source: string, timestamp: Date = new Date()): void {
    const existingNarrative = this.narratives.get(narrative.id);

    if (existingNarrative) {
      // Update existing narrative
      existingNarrative.lastSeen = timestamp;
      existingNarrative.prevalence += 1;
      if (!existingNarrative.sources.includes(source)) {
        existingNarrative.sources.push(source);
      }

      // Track evolution
      this.trackEvolution(narrative, timestamp);
    } else {
      // New narrative
      this.narratives.set(narrative.id, {
        ...narrative,
        firstSeen: timestamp,
        lastSeen: timestamp,
        sources: [source],
      });

      // Initialize evolution tracking
      this.evolutions.set(narrative.id, {
        narrativeId: narrative.id,
        versions: [
          {
            version: 1,
            timestamp,
            changes: ['Initial version'],
            narrative,
          },
        ],
        divergencePoints: [],
        convergencePoints: [],
      });
    }
  }

  getNarrative(narrativeId: string): Narrative | undefined {
    return this.narratives.get(narrativeId);
  }

  getAllNarratives(): Narrative[] {
    return Array.from(this.narratives.values());
  }

  getActiveNarratives(timeWindow: number = 24 * 60 * 60 * 1000): Narrative[] {
    const now = new Date();
    return this.getAllNarratives().filter(narrative => {
      const timeDiff = now.getTime() - narrative.lastSeen.getTime();
      return timeDiff <= timeWindow;
    });
  }

  getTrendingNarratives(limit: number = 10): Narrative[] {
    return this.getAllNarratives()
      .sort((a, b) => b.prevalence - a.prevalence)
      .slice(0, limit);
  }

  getEvolution(narrativeId: string): NarrativeEvolution | undefined {
    return this.evolutions.get(narrativeId);
  }

  findSimilarNarratives(narrative: Narrative, threshold: number = 0.7): Narrative[] {
    const similar: Narrative[] = [];

    for (const existing of this.narratives.values()) {
      if (existing.id === narrative.id) continue;

      const similarity = this.calculateSimilarity(narrative, existing);
      if (similarity >= threshold) {
        similar.push(existing);
      }
    }

    return similar;
  }

  detectDivergence(
    narrativeId: string,
    newVersion: Narrative,
    timestamp: Date = new Date()
  ): void {
    const evolution = this.evolutions.get(narrativeId);
    if (!evolution) return;

    const currentVersion = evolution.versions[evolution.versions.length - 1];
    const changes = this.detectChanges(currentVersion.narrative, newVersion);

    if (changes.length > 0) {
      const divergencePoint: DivergencePoint = {
        timestamp,
        originalVersion: currentVersion.version,
        newBranches: [newVersion.id],
        reason: changes.join(', '),
      };

      evolution.divergencePoints.push(divergencePoint);
    }
  }

  private trackEvolution(narrative: Narrative, timestamp: Date): void {
    const evolution = this.evolutions.get(narrative.id);
    if (!evolution) return;

    const lastVersion = evolution.versions[evolution.versions.length - 1];
    const changes = this.detectChanges(lastVersion.narrative, narrative);

    if (changes.length > 0) {
      const newVersion: NarrativeVersion = {
        version: evolution.versions.length + 1,
        timestamp,
        changes,
        narrative,
      };

      evolution.versions.push(newVersion);
    }
  }

  private detectChanges(oldNarrative: Narrative, newNarrative: Narrative): string[] {
    const changes: string[] = [];

    // Check theme changes
    const oldThemes = new Set(oldNarrative.themes);
    const newThemes = new Set(newNarrative.themes);

    for (const theme of newThemes) {
      if (!oldThemes.has(theme)) {
        changes.push(`Added theme: ${theme}`);
      }
    }

    for (const theme of oldThemes) {
      if (!newThemes.has(theme)) {
        changes.push(`Removed theme: ${theme}`);
      }
    }

    // Check sentiment change
    const sentimentDiff = Math.abs(newNarrative.sentiment - oldNarrative.sentiment);
    if (sentimentDiff > 0.3) {
      changes.push(
        `Sentiment shift: ${oldNarrative.sentiment.toFixed(2)} → ${newNarrative.sentiment.toFixed(2)}`
      );
    }

    // Check framing change
    if (oldNarrative.framing.mainFrame !== newNarrative.framing.mainFrame) {
      changes.push(
        `Framing change: ${oldNarrative.framing.mainFrame} → ${newNarrative.framing.mainFrame}`
      );
    }

    return changes;
  }

  private calculateSimilarity(narrative1: Narrative, narrative2: Narrative): number {
    let similarity = 0;
    let totalFactors = 0;

    // Theme overlap
    const themes1 = new Set(narrative1.themes);
    const themes2 = new Set(narrative2.themes);
    const themeOverlap = [...themes1].filter(t => themes2.has(t)).length;
    const themeUnion = new Set([...themes1, ...themes2]).size;

    if (themeUnion > 0) {
      similarity += themeOverlap / themeUnion;
      totalFactors += 1;
    }

    // Framing similarity
    if (narrative1.framing.mainFrame === narrative2.framing.mainFrame) {
      similarity += 1;
    }
    totalFactors += 1;

    // Sentiment similarity
    const sentimentDiff = Math.abs(narrative1.sentiment - narrative2.sentiment);
    similarity += 1 - sentimentDiff / 2; // Normalize to 0-1
    totalFactors += 1;

    return totalFactors > 0 ? similarity / totalFactors : 0;
  }

  clearOldNarratives(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    const now = new Date();
    let removedCount = 0;

    for (const [id, narrative] of this.narratives.entries()) {
      const age = now.getTime() - narrative.lastSeen.getTime();
      if (age > maxAge) {
        this.narratives.delete(id);
        this.evolutions.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }
}
