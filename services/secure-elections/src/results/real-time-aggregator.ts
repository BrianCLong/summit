import crypto from 'crypto';
import { EventEmitter } from 'events';
import type { Election, VoteSelection } from '../types/election.js';

/**
 * Real-Time Results Aggregation Engine
 *
 * Provides live vote tallying with instant updates while maintaining
 * privacy guarantees and audit trail integrity.
 */

export interface TallyResult {
  itemId: string;
  title: string;
  type: string;
  options: Array<{
    optionId: string;
    label: string;
    votes: number;
    percentage: number;
  }>;
  totalVotes: number;
  lastUpdated: string;
  status: 'preliminary' | 'partial' | 'final' | 'certified';
}

export interface ElectionResults {
  electionId: string;
  name: string;
  jurisdiction: string;
  reportingProgress: number;
  precinctsCounted: number;
  precinctsTotal: number;
  items: TallyResult[];
  lastUpdated: string;
  auditHash: string;
}

export interface RealtimeUpdate {
  type: 'vote_recorded' | 'precinct_reported' | 'results_certified';
  electionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export class RealTimeAggregator extends EventEmitter {
  private elections: Map<string, Election> = new Map();
  private tallies: Map<string, Map<string, Map<string, number>>> = new Map();
  private precinctStatus: Map<string, Map<string, boolean>> = new Map();
  private updateHistory: RealtimeUpdate[] = [];

  /**
   * Register an election for real-time tracking
   */
  registerElection(election: Election, precincts: string[]): void {
    this.elections.set(election.electionId, election);

    // Initialize tallies for each ballot item
    const itemTallies = new Map<string, Map<string, number>>();
    for (const item of election.ballotItems) {
      const optionCounts = new Map<string, number>();
      for (const option of item.options) {
        optionCounts.set(option.optionId, 0);
      }
      itemTallies.set(item.itemId, optionCounts);
    }
    this.tallies.set(election.electionId, itemTallies);

    // Initialize precinct tracking
    const precinctMap = new Map<string, boolean>();
    for (const precinct of precincts) {
      precinctMap.set(precinct, false);
    }
    this.precinctStatus.set(election.electionId, precinctMap);
  }

  /**
   * Record a decrypted vote (after polls close)
   */
  recordVote(electionId: string, selections: VoteSelection[]): void {
    const itemTallies = this.tallies.get(electionId);
    if (!itemTallies) {
      throw new Error(`Election ${electionId} not registered`);
    }

    for (const selection of selections) {
      const optionCounts = itemTallies.get(selection.itemId);
      if (optionCounts) {
        for (const optionId of selection.selectedOptions) {
          const current = optionCounts.get(optionId) || 0;
          optionCounts.set(optionId, current + 1);
        }
      }
    }

    this.emitUpdate({
      type: 'vote_recorded',
      electionId,
      timestamp: new Date().toISOString(),
      data: { selectionsCount: selections.length },
    });
  }

  /**
   * Report batch results from a precinct
   */
  reportPrecinct(
    electionId: string,
    precinctId: string,
    results: Map<string, Map<string, number>>
  ): void {
    const itemTallies = this.tallies.get(electionId);
    const precincts = this.precinctStatus.get(electionId);

    if (!itemTallies || !precincts) {
      throw new Error(`Election ${electionId} not registered`);
    }

    // Add precinct results to running totals
    for (const [itemId, options] of results) {
      const existingCounts = itemTallies.get(itemId);
      if (existingCounts) {
        for (const [optionId, count] of options) {
          const current = existingCounts.get(optionId) || 0;
          existingCounts.set(optionId, current + count);
        }
      }
    }

    precincts.set(precinctId, true);

    this.emitUpdate({
      type: 'precinct_reported',
      electionId,
      timestamp: new Date().toISOString(),
      data: {
        precinctId,
        progress: this.getReportingProgress(electionId),
      },
    });
  }

  /**
   * Get current results for an election
   */
  getResults(electionId: string): ElectionResults | null {
    const election = this.elections.get(electionId);
    const itemTallies = this.tallies.get(electionId);
    const precincts = this.precinctStatus.get(electionId);

    if (!election || !itemTallies || !precincts) {
      return null;
    }

    const items: TallyResult[] = election.ballotItems.map((item) => {
      const optionCounts = itemTallies.get(item.itemId) || new Map();
      const totalVotes = Array.from(optionCounts.values()).reduce((a, b) => a + b, 0);

      const options = item.options.map((opt) => {
        const votes = optionCounts.get(opt.optionId) || 0;
        return {
          optionId: opt.optionId,
          label: opt.label,
          votes,
          percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
        };
      });

      // Sort by votes descending
      options.sort((a, b) => b.votes - a.votes);

      return {
        itemId: item.itemId,
        title: item.title,
        type: item.type,
        options,
        totalVotes,
        lastUpdated: new Date().toISOString(),
        status: this.getResultStatus(electionId),
      };
    });

    const precinctsCounted = Array.from(precincts.values()).filter(Boolean).length;
    const precinctsTotal = precincts.size;

    return {
      electionId,
      name: election.name,
      jurisdiction: election.jurisdiction,
      reportingProgress: (precinctsCounted / precinctsTotal) * 100,
      precinctsCounted,
      precinctsTotal,
      items,
      lastUpdated: new Date().toISOString(),
      auditHash: this.computeAuditHash(electionId),
    };
  }

  /**
   * Certify final results
   */
  certifyResults(electionId: string): { certified: boolean; hash: string } {
    const election = this.elections.get(electionId);
    if (!election) {
      throw new Error(`Election ${electionId} not found`);
    }

    const progress = this.getReportingProgress(electionId);
    if (progress < 100) {
      throw new Error('Cannot certify: not all precincts reported');
    }

    election.status = 'certified';
    const auditHash = this.computeAuditHash(electionId);
    election.auditTrailHash = auditHash;

    this.emitUpdate({
      type: 'results_certified',
      electionId,
      timestamp: new Date().toISOString(),
      data: { auditHash },
    });

    return { certified: true, hash: auditHash };
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(
    electionId: string,
    callback: (update: RealtimeUpdate) => void
  ): () => void {
    const handler = (update: RealtimeUpdate) => {
      if (update.electionId === electionId) {
        callback(update);
      }
    };

    this.on('update', handler);
    return () => this.off('update', handler);
  }

  /**
   * Get update history for audit
   */
  getUpdateHistory(electionId: string): RealtimeUpdate[] {
    return this.updateHistory.filter((u) => u.electionId === electionId);
  }

  private getReportingProgress(electionId: string): number {
    const precincts = this.precinctStatus.get(electionId);
    if (!precincts || precincts.size === 0) return 0;

    const counted = Array.from(precincts.values()).filter(Boolean).length;
    return (counted / precincts.size) * 100;
  }

  private getResultStatus(electionId: string): TallyResult['status'] {
    const election = this.elections.get(electionId);
    if (election?.status === 'certified') return 'certified';

    const progress = this.getReportingProgress(electionId);
    if (progress === 100) return 'final';
    if (progress > 0) return 'partial';
    return 'preliminary';
  }

  private computeAuditHash(electionId: string): string {
    const results = this.tallies.get(electionId);
    if (!results) return '';

    const data = JSON.stringify(Array.from(results.entries()));
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private emitUpdate(update: RealtimeUpdate): void {
    this.updateHistory.push(update);
    this.emit('update', update);
  }
}

/**
 * Ranked Choice Voting tabulator
 */
export class RankedChoiceTabulator {
  /**
   * Tabulate ranked choice results using instant runoff
   */
  tabulate(
    ballots: Array<{ rankings: string[] }>,
    candidates: string[]
  ): {
    winner: string | null;
    rounds: Array<{ eliminated: string | null; counts: Map<string, number> }>;
  } {
    const rounds: Array<{ eliminated: string | null; counts: Map<string, number> }> = [];
    let activeCandidates = new Set(candidates);
    let activeBallots = ballots.map((b) => ({ ...b, currentIndex: 0 }));

    while (activeCandidates.size > 1) {
      // Count first-choice votes among active candidates
      const counts = new Map<string, number>();
      for (const candidate of activeCandidates) {
        counts.set(candidate, 0);
      }

      for (const ballot of activeBallots) {
        // Find first active candidate in ranking
        while (
          ballot.currentIndex < ballot.rankings.length &&
          !activeCandidates.has(ballot.rankings[ballot.currentIndex])
        ) {
          ballot.currentIndex++;
        }

        if (ballot.currentIndex < ballot.rankings.length) {
          const choice = ballot.rankings[ballot.currentIndex];
          counts.set(choice, (counts.get(choice) || 0) + 1);
        }
      }

      const totalVotes = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const majority = totalVotes / 2;

      // Check for majority winner
      for (const [candidate, votes] of counts) {
        if (votes > majority) {
          rounds.push({ eliminated: null, counts: new Map(counts) });
          return { winner: candidate, rounds };
        }
      }

      // Eliminate candidate with fewest votes
      let minVotes = Infinity;
      let eliminated: string | null = null;
      for (const [candidate, votes] of counts) {
        if (votes < minVotes) {
          minVotes = votes;
          eliminated = candidate;
        }
      }

      rounds.push({ eliminated, counts: new Map(counts) });

      if (eliminated) {
        activeCandidates.delete(eliminated);
      }
    }

    const winner = activeCandidates.size === 1
      ? Array.from(activeCandidates)[0]
      : null;

    return { winner, rounds };
  }
}
