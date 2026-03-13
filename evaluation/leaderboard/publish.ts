import * as fs from 'node:fs';
import * as path from 'node:path';
import { verifyResultBundle } from './verify-result';
import { SignedResultBundle } from './sign-result';

export interface LeaderboardEntry {
  modelName: string;
  submitter: string;
  timestamp: string;
  metrics: Record<string, any>;
  score: number;
}

export interface Leaderboard {
  lastUpdated: string;
  benchmarkVersion: string;
  entries: LeaderboardEntry[];
}

/**
 * Aggregates signed result bundles into a publishable leaderboard.
 *
 * @param bundlePaths - Array of paths to signed result bundles
 * @param publicKeyHex - Public key to verify the bundles
 * @returns The aggregated leaderboard
 */
export function aggregateLeaderboard(bundlePaths: string[], publicKeyHex: string): Leaderboard {
  const entries: LeaderboardEntry[] = [];
  let benchmarkVersion = '';

  for (const bundlePath of bundlePaths) {
    try {
      const bundleContent = fs.readFileSync(bundlePath, 'utf8');
      const bundle: SignedResultBundle = JSON.parse(bundleContent);

      if (!verifyResultBundle(bundle, publicKeyHex)) {
        console.warn(`Invalid signature for bundle: ${bundlePath}`);
        continue;
      }

      if (!benchmarkVersion) {
        benchmarkVersion = bundle.benchmarkVersion;
      } else if (benchmarkVersion !== bundle.benchmarkVersion) {
        console.warn(`Benchmark version mismatch in bundle: ${bundlePath}. Expected ${benchmarkVersion}, got ${bundle.benchmarkVersion}`);
        continue;
      }

      entries.push({
        modelName: bundle.report.modelName || 'Unknown Model',
        submitter: bundle.report.submitter || 'Unknown Submitter',
        timestamp: bundle.stamp.timestamp,
        metrics: bundle.metrics,
        score: bundle.report.score || 0
      });
    } catch (error) {
      console.error(`Error processing bundle ${bundlePath}:`, error);
    }
  }

  // Sort entries descending by score
  entries.sort((a, b) => b.score - a.score);

  return {
    lastUpdated: new Date().toISOString(),
    benchmarkVersion: benchmarkVersion || 'unknown',
    entries
  };
}

/**
 * Writes the leaderboard to a JSON file.
 *
 * @param leaderboard - The leaderboard to publish
 * @param outputPath - Path to write the JSON file
 */
export function publishLeaderboard(leaderboard: Leaderboard, outputPath: string): void {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(leaderboard, null, 2), 'utf8');
}
