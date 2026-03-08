"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankedChoiceTabulator = exports.RealTimeAggregator = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const events_1 = require("events");
class RealTimeAggregator extends events_1.EventEmitter {
    elections = new Map();
    tallies = new Map();
    precinctStatus = new Map();
    updateHistory = [];
    /**
     * Register an election for real-time tracking
     */
    registerElection(election, precincts) {
        this.elections.set(election.electionId, election);
        // Initialize tallies for each ballot item
        const itemTallies = new Map();
        for (const item of election.ballotItems) {
            const optionCounts = new Map();
            for (const option of item.options) {
                optionCounts.set(option.optionId, 0);
            }
            itemTallies.set(item.itemId, optionCounts);
        }
        this.tallies.set(election.electionId, itemTallies);
        // Initialize precinct tracking
        const precinctMap = new Map();
        for (const precinct of precincts) {
            precinctMap.set(precinct, false);
        }
        this.precinctStatus.set(election.electionId, precinctMap);
    }
    /**
     * Record a decrypted vote (after polls close)
     */
    recordVote(electionId, selections) {
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
    reportPrecinct(electionId, precinctId, results) {
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
    getResults(electionId) {
        const election = this.elections.get(electionId);
        const itemTallies = this.tallies.get(electionId);
        const precincts = this.precinctStatus.get(electionId);
        if (!election || !itemTallies || !precincts) {
            return null;
        }
        const items = election.ballotItems.map((item) => {
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
    certifyResults(electionId) {
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
    subscribe(electionId, callback) {
        const handler = (update) => {
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
    getUpdateHistory(electionId) {
        return this.updateHistory.filter((u) => u.electionId === electionId);
    }
    getReportingProgress(electionId) {
        const precincts = this.precinctStatus.get(electionId);
        if (!precincts || precincts.size === 0) {
            return 0;
        }
        const counted = Array.from(precincts.values()).filter(Boolean).length;
        return (counted / precincts.size) * 100;
    }
    getResultStatus(electionId) {
        const election = this.elections.get(electionId);
        if (election?.status === 'certified') {
            return 'certified';
        }
        const progress = this.getReportingProgress(electionId);
        if (progress === 100) {
            return 'final';
        }
        if (progress > 0) {
            return 'partial';
        }
        return 'preliminary';
    }
    computeAuditHash(electionId) {
        const results = this.tallies.get(electionId);
        if (!results) {
            return '';
        }
        const data = JSON.stringify(Array.from(results.entries()));
        return node_crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    emitUpdate(update) {
        this.updateHistory.push(update);
        this.emit('update', update);
    }
}
exports.RealTimeAggregator = RealTimeAggregator;
/**
 * Ranked Choice Voting tabulator
 */
class RankedChoiceTabulator {
    /**
     * Tabulate ranked choice results using instant runoff
     */
    tabulate(ballots, candidates) {
        const rounds = [];
        const activeCandidates = new Set(candidates);
        const activeBallots = ballots.map((b) => ({ ...b, currentIndex: 0 }));
        while (activeCandidates.size > 1) {
            // Count first-choice votes among active candidates
            const counts = new Map();
            for (const candidate of activeCandidates) {
                counts.set(candidate, 0);
            }
            for (const ballot of activeBallots) {
                // Find first active candidate in ranking
                while (ballot.currentIndex < ballot.rankings.length &&
                    !activeCandidates.has(ballot.rankings[ballot.currentIndex])) {
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
            let eliminated = null;
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
exports.RankedChoiceTabulator = RankedChoiceTabulator;
