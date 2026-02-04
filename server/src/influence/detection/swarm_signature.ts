
import { Actor, SocialPost } from '../types.js';
import { NarrativeEvent } from '../../narrative/types.js';
import { ActorClass, ActorProfile, isSwarmCandidate } from '../../narrative/primitives.js';

/**
 * SWARM SIGNATURE DETECTOR
 *
 * Implements "Coordination Physics" detection for AI Bot Swarms (Nature 2026).
 * Focuses on collective behavior metrics rather than individual account heuristics.
 */

export interface SwarmDetectionResult {
  isSwarm: boolean;
  confidence: number;
  swarmId?: string;
  metrics: {
    temporalCoordination: number; // 0-1
    semanticDivergence: number; // 0-1
    networkDensity?: number;
  };
  reason: string;
}

export class SwarmDetector {

  /**
   * Detects temporal coordination (micro-bursts) in a set of events.
   * High score = Events happen in unnatural lockstep.
   */
  public detectTemporalCoordination(events: NarrativeEvent[]): number {
    if (events.length < 2) return 0.0;

    // Sort by timestamp (assuming scheduledTick or metadata timestamp exists, mapping to number)
    // Here we use scheduledTick as a proxy for time if timestamp unavailable
    const times = events.map(e => e.scheduledTick ?? 0).sort((a, b) => a - b);

    // Calculate inter-arrival times
    const diffs: number[] = [];
    for (let i = 1; i < times.length; i++) {
      diffs.push(times[i] - times[i - 1]);
    }

    if (diffs.length === 0) return 0.0;

    // Calculate Coefficient of Variation (CV) = stdDev / mean
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (mean === 0) return 1.0; // Perfect synchronization (all diffs = 0)

    const variance = diffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / diffs.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Low CV implies regularity (periodic). Very low CV (near 0) implies simultaneous bursting.
    // We invert CV to get a "coordination score" (High coordination = Low CV).
    // Heuristic: If CV < 0.5, coordination is high.

    // Normalize: 1 / (1 + CV) -> ranges 0 to 1. CV=0 -> 1. CV=big -> 0.
    return 1.0 / (1.0 + cv);
  }

  /**
   * Detects semantic divergence using simple content analysis heuristics.
   * AI Swarms use LLMs to rephrase the same intent.
   * High Divergence + High Intent Match = Swarm.
   *
   * Note: Real implementation would use embedding distance (e.g. OpenAI ada-002 or local BERT).
   * TODO: Replace Jaccard 3-gram proxy with vector similarity once embedding service is available.
   */
  public detectSemanticDivergence(posts: SocialPost[]): number {
    if (posts.length < 2) return 0.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < posts.length; i++) {
      for (let j = i + 1; j < posts.length; j++) {
        const sim = this.jaccardSimilarity(posts[i].content, posts[j].content);
        totalSimilarity += sim;
        comparisons++;
      }
    }

    const avgSimilarity = totalSimilarity / comparisons;

    // Divergence is the inverse of similarity.
    // If they are identical (sim=1), divergence is 0.
    // If they are totally different (sim=0), divergence is 1.
    return 1.0 - avgSimilarity;
  }

  /**
   * Aggregates metrics to assess if a group of actors constitutes a swarm.
   */
  public assessCollectiveBehavior(
    actors: Actor[],
    posts: SocialPost[],
    events: NarrativeEvent[]
  ): SwarmDetectionResult {

    const temporalScore = this.detectTemporalCoordination(events);
    const divergenceScore = this.detectSemanticDivergence(posts);

    // Logic:
    // A swarm exhibits high temporal coordination (they act together).
    // But they try to hide it with high semantic divergence (AI rewriting).
    // Simple bots have high coordination + low divergence (copy-paste).
    // Humans have low coordination + high divergence.

    // Swarm Signature: High Coord (> 0.7) AND High Divergence (> 0.5)

    const isSwarm = temporalScore > 0.7 && divergenceScore > 0.5;

    let confidence = 0.0;
    if (isSwarm) {
      confidence = (temporalScore + divergenceScore) / 2;
    }

    // Determine reason
    let reason = "Normal organic behavior";
    if (temporalScore > 0.7 && divergenceScore <= 0.5) {
      reason = "Simple Botnet (High Coord, Low Divergence)";
    } else if (temporalScore > 0.7 && divergenceScore > 0.5) {
      reason = "AI Swarm (High Coord, High Divergence)";
    } else if (temporalScore <= 0.7 && divergenceScore <= 0.5) {
      reason = "Echo Chamber (Low Coord, Low Divergence)";
    }

    return {
      isSwarm: reason.includes("AI Swarm"),
      confidence,
      metrics: {
        temporalCoordination: temporalScore,
        semanticDivergence: divergenceScore
      },
      reason
    };
  }

  // --- Helpers ---

  private jaccardSimilarity(s1: string, s2: string): number {
    const set1 = this.getNGrams(s1, 2);
    const set2 = this.getNGrams(s2, 2);

    if (set1.size === 0 || set2.size === 0) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private getNGrams(text: string, n: number): Set<string> {
    const words = text.toLowerCase().split(/\s+/);
    const grams = new Set<string>();
    if (words.length < n) return grams;

    for (let i = 0; i <= words.length - n; i++) {
      grams.add(words.slice(i, i + n).join(' '));
    }
    return grams;
  }
}
