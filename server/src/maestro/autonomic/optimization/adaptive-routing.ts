
export interface RouteScore {
  agentId: string;
  score: number; // 0-1
  confidence: number; // 0-1 based on sample size
  breakdown: {
    latency: number;
    success: number;
    cost: number;
  };
}

export interface PerformanceProfile {
  agentId: string;
  model: string;
  taskType: string;
  stats: {
    avgLatency: number;
    successRate: number; // 0-1
    avgCost: number;
    sampleSize: number;
  };
  lastUpdated: Date;
}

export class AdaptiveRoutingService {
  private profiles: Map<string, PerformanceProfile> = new Map();

  // Epsilon for epsilon-greedy strategy
  private epsilon = 0.1;

  public updateProfile(agentId: string, taskType: string, latency: number, success: boolean, cost: number) {
    const key = `${agentId}:${taskType}`;
    let profile = this.profiles.get(key);

    if (!profile) {
      profile = {
        agentId,
        model: 'unknown', // Would look up from registry
        taskType,
        stats: { avgLatency: 0, successRate: 0, avgCost: 0, sampleSize: 0 },
        lastUpdated: new Date()
      };
    }

    // Online update average
    const n = profile.stats.sampleSize;
    profile.stats.avgLatency = (profile.stats.avgLatency * n + latency) / (n + 1);
    profile.stats.successRate = (profile.stats.successRate * n + (success ? 1 : 0)) / (n + 1);
    profile.stats.avgCost = (profile.stats.avgCost * n + cost) / (n + 1);
    profile.stats.sampleSize += 1;
    profile.lastUpdated = new Date();

    this.profiles.set(key, profile);
  }

  public getBestAgent(taskType: string, candidates: string[]): string {
    // Epsilon-greedy: Explore random agent
    if (Math.random() < this.epsilon) {
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      console.log(`[Routing] Exploring random agent: ${random}`);
      return random;
    }

    // Exploit: Best score
    let bestAgent = candidates[0];
    let bestScore = -1;

    for (const agentId of candidates) {
      const score = this.calculateScore(agentId, taskType);
      if (score.score > bestScore) {
        bestScore = score.score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  private calculateScore(agentId: string, taskType: string): RouteScore {
    const key = `${agentId}:${taskType}`;
    const profile = this.profiles.get(key);

    if (!profile || profile.stats.sampleSize < 5) {
      // Cold start / low confidence
      return {
        agentId,
        score: 0.5, // Neutral start
        confidence: 0.1,
        breakdown: { latency: 0, success: 0, cost: 0 }
      };
    }

    // Simple weighted score
    // Success is most important (0.6), Latency (0.2), Cost (0.2)
    // Normalize latency: assume 5000ms is "bad" (0 score), 0ms is "good" (1 score)
    const latencyScore = Math.max(0, 1 - (profile.stats.avgLatency / 5000));
    // Normalize cost: assume 0.10 is "expensive"
    const costScore = Math.max(0, 1 - (profile.stats.avgCost / 0.10));

    const totalScore =
      (profile.stats.successRate * 0.6) +
      (latencyScore * 0.2) +
      (costScore * 0.2);

    return {
      agentId,
      score: totalScore,
      confidence: Math.min(1, profile.stats.sampleSize / 20),
      breakdown: {
        success: profile.stats.successRate,
        latency: latencyScore,
        cost: costScore
      }
    };
  }
}
