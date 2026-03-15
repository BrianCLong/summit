import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SignedResultBundle } from './sign-result.ts';
import { verifyResultBundle } from './verify-result.ts';

export interface LeaderboardEntry {
  submitterId: string;
  score: number;
  timestamp: string;
  protocolVersion: string;
  benchmarkVersion: string;
}

export interface LeaderboardData {
  lastUpdated: string;
  entries: LeaderboardEntry[];
}

/**
 * Aggregates scores from signed bundles and filters out invalid ones.
 *
 * @param bundles - The array of signed bundles
 * @param publicKeyHex - The public key hex string to verify signatures
 * @returns Sorted array of valid leaderboard entries
 */
export function aggregateScores(bundles: SignedResultBundle[], publicKeyHex: string): LeaderboardEntry[] {
  const validEntries: LeaderboardEntry[] = [];

  for (const bundle of bundles) {
    if (verifyResultBundle(bundle, publicKeyHex)) {
      const submitterId = bundle.report?.submitterId || 'anonymous';
      const score = bundle.metrics?.overallScore || 0;
      const timestamp = bundle.stamp?.timestamp || new Date().toISOString();

      validEntries.push({
        submitterId,
        score,
        timestamp,
        protocolVersion: bundle.protocolVersion,
        benchmarkVersion: bundle.benchmarkVersion
      });
    }
  }

  // Strictly sort entries to ensure deterministic artifact generation
  validEntries.sort((a, b) => {
    // Sort by score descending
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Then sort by submitterId ascending
    if (a.submitterId !== b.submitterId) {
      return a.submitterId.localeCompare(b.submitterId);
    }
    // Finally sort by timestamp ascending
    return a.timestamp.localeCompare(b.timestamp);
  });

  return validEntries;
}

/**
 * Writes the aggregated leaderboard data to a deterministic JSON artifact.
 *
 * @param entries - The sorted leaderboard entries
 * @param outputFilePath - The path to save the leaderboard JSON artifact
 */
export function writeLeaderboard(entries: LeaderboardEntry[], outputFilePath: string): void {
  const data: LeaderboardData = {
    lastUpdated: new Date().toISOString(),
    entries
  };

  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Serialize to strictly sorted JSON (spacing 2) to ensure structural stability
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
}
