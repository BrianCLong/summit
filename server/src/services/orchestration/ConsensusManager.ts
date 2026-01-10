import logger from '../../utils/logger.js';
import { ConsensusRequest, ConsensusResult } from './types.js';

export class ConsensusManager {
  private static instance: ConsensusManager;
  private activeConsensus: Map<string, ConsensusRequest> = new Map();
  private votes: Map<string, Record<string, any>> = new Map();

  private constructor() {}

  public static getInstance(): ConsensusManager {
    if (!ConsensusManager.instance) {
      ConsensusManager.instance = new ConsensusManager();
    }
    return ConsensusManager.instance;
  }

  public initiateConsensus(request: ConsensusRequest): void {
    this.activeConsensus.set(request.id, request);
    this.votes.set(request.id, {});
    logger.info(`Consensus initiated: ${request.id} (Topic: ${request.topic})`);

    // Set deadline timeout
    const timeoutMs = request.deadline.getTime() - Date.now();
    if (timeoutMs > 0) {
      setTimeout(() => this.finalizeConsensus(request.id), timeoutMs);
    } else {
      this.finalizeConsensus(request.id);
    }
  }

  public castVote(requestId: string, agentId: string, vote: any): void {
    const request = this.activeConsensus.get(requestId);
    if (!request) {
      throw new Error(`Consensus request ${requestId} not found or expired`);
    }

    if (!request.participants.includes(agentId)) {
      throw new Error(`Agent ${agentId} is not a participant in consensus ${requestId}`);
    }

    const currentVotes = this.votes.get(requestId) || {};
    currentVotes[agentId] = vote;
    this.votes.set(requestId, currentVotes);

    // Check if all participants have voted
    if (Object.keys(currentVotes).length === request.participants.length) {
      this.finalizeConsensus(requestId);
    }
  }

  public getResult(requestId: string): ConsensusResult | null {
    // This assumes results are stored somewhere persistent or returned via event/callback.
    // For this implementation, we return null if still active, or need a way to retrieve finished ones.
    // Currently, finalizeConsensus just logs. Ideally it should store the result.
    return null; // Todo: implement result storage
  }

  private finalizeConsensus(requestId: string): ConsensusResult {
    const request = this.activeConsensus.get(requestId);
    if (!request) {
        throw new Error("Consensus request not found");
    }

    const currentVotes = this.votes.get(requestId) || {};

    let outcome: any = null;
    let confidence = 0;

    if (request.strategy === 'majority') {
      // Count votes
      const counts: Record<string, number> = {};
      for (const vote of Object.values(currentVotes)) {
        const key = JSON.stringify(vote);
        counts[key] = (counts[key] || 0) + 1;
      }

      // Find max
      let maxVotes = 0;
      let winner = null;
      for (const [key, count] of Object.entries(counts)) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = key;
        }
      }

      if (winner) {
        outcome = JSON.parse(winner);
        confidence = maxVotes / request.participants.length;
      }
    } else if (request.strategy === 'unanimous') {
        const values = Object.values(currentVotes);
        if (values.length > 0) {
             const first = JSON.stringify(values[0]);
             const allMatch = values.every(v => JSON.stringify(v) === first);
             if (allMatch && values.length === request.participants.length) {
                 outcome = values[0];
                 confidence = 1.0;
             }
        }
    }
    // Weighted strategy...

    const result: ConsensusResult = {
      requestId,
      outcome,
      confidence,
      votes: currentVotes,
      timestamp: new Date()
    };

    logger.info(`Consensus finalized for ${requestId}`, result);

    // Cleanup
    this.activeConsensus.delete(requestId);
    this.votes.delete(requestId);

    return result;
  }
}
