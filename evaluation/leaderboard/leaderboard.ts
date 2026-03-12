import { SignedResultBundle } from './sign-result';
import { verifyResultBundle } from './verify-result';

export interface LeaderboardEntry {
  protocolVersion: string;
  benchmarkVersion: string;
  score: number;
  metrics: Record<string, any>;
}

/**
 * Generates a sorted leaderboard from an array of signed benchmark result bundles.
 * Invalid signatures are ignored.
 *
 * @param bundles - Array of signed benchmark result bundles
 * @param publicKeyHex - The hex-encoded ed25519 public key used for verification
 * @returns An array of leaderboard entries sorted by score (descending)
 */
export function generateLeaderboard(bundles: SignedResultBundle[], publicKeyHex: string): LeaderboardEntry[] {
  const validEntries: LeaderboardEntry[] = [];

  for (const bundle of bundles) {
    if (verifyResultBundle(bundle, publicKeyHex)) {
      const score = typeof bundle.metrics?.score === 'number' ? bundle.metrics.score : 0;

      validEntries.push({
        protocolVersion: bundle.protocolVersion,
        benchmarkVersion: bundle.benchmarkVersion,
        score,
        metrics: bundle.metrics
      });
    }
  }

  // Sort descending by score
  return validEntries.sort((a, b) => b.score - a.score);
}
