import { SignedResultBundle } from './sign-result';
import { verifyResultBundle } from './verify-result';

export interface LeaderboardEntry {
  agentId: string;
  submitterId: string;
  benchmarkVersion: string;
  score: number;
  timestamp: string;
}

export interface LeaderboardPublisher {
  lastUpdated: string;
  entries: LeaderboardEntry[];
}

/**
 * Aggregates a list of signed result bundles into a publishable leaderboard JSON structure.
 * Only bundles with valid ed25519 signatures are included.
 *
 * @param bundles - Array of signed result bundles
 * @param publicKeyHex - The hex-encoded ed25519 public key used to verify the bundles
 * @returns A deterministically sorted leaderboard structure
 */
export function aggregateLeaderboard(bundles: SignedResultBundle[], publicKeyHex: string): LeaderboardPublisher {
  const entries: LeaderboardEntry[] = [];

  for (const bundle of bundles) {
    if (!verifyResultBundle(bundle, publicKeyHex)) {
      continue;
    }

    // Extract necessary data, falling back to safe defaults if the structure varies
    const agentId = bundle.stamp?.agentId || bundle.report?.agentId || 'unknown';
    const submitterId = bundle.stamp?.submitterId || bundle.report?.submitterId || 'unknown';
    const score = bundle.metrics?.score || bundle.metrics?.accuracy || 0;
    const timestamp = bundle.stamp?.timestamp || new Date().toISOString();

    entries.push({
      agentId,
      submitterId,
      benchmarkVersion: bundle.benchmarkVersion,
      score,
      timestamp,
    });
  }

  // Deterministically sort entries: by score (descending), then agentId (ascending), then submitterId (ascending)
  entries.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    if (a.agentId !== b.agentId) {
      return a.agentId.localeCompare(b.agentId);
    }
    return a.submitterId.localeCompare(b.submitterId);
  });

  return {
    lastUpdated: new Date().toISOString(),
    entries,
  };
}
