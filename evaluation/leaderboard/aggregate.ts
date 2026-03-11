import type { SignedResultBundle } from './sign-result.ts';

export interface LeaderboardEntry {
  agentName: string;
  totalScore: number;
  tasksCompleted: number;
  timestamp: string;
  verified: boolean;
}

export interface Leaderboard {
  lastUpdated: string;
  entries: LeaderboardEntry[];
}

export function createLeaderboardEntry(bundle: SignedResultBundle, isVerified: boolean): LeaderboardEntry {
  return {
    agentName: bundle.report.agentName || 'Unknown',
    totalScore: bundle.metrics.totalScore || 0,
    tasksCompleted: bundle.metrics.tasksCompleted || 0,
    timestamp: bundle.stamp.timestamp || new Date().toISOString(),
    verified: isVerified
  };
}

export function aggregateLeaderboard(entries: LeaderboardEntry[]): Leaderboard {
  // Sort by totalScore descending
  const sortedEntries = [...entries].sort((a, b) => b.totalScore - a.totalScore);

  return {
    lastUpdated: new Date().toISOString(),
    entries: sortedEntries
  };
}
