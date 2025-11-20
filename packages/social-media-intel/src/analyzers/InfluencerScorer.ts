/**
 * Influencer Scorer - Scores and ranks influencers
 */

import type { SocialProfile, SocialPost } from '../types/index.js';

export interface InfluencerScore {
  username: string;
  platform: string;
  overallScore: number;
  rank?: number;
  metrics: {
    reach: number;
    engagement: number;
    authority: number;
    consistency: number;
    growth: number;
  };
  category: 'nano' | 'micro' | 'macro' | 'mega';
}

export class InfluencerScorer {
  /**
   * Calculate influencer score
   */
  scoreInfluencer(profile: SocialProfile, posts: SocialPost[]): InfluencerScore {
    const metrics = {
      reach: this.calculateReach(profile),
      engagement: this.calculateEngagement(profile, posts),
      authority: this.calculateAuthority(profile),
      consistency: this.calculateConsistency(posts),
      growth: this.calculateGrowth(profile)
    };

    // Weighted overall score
    const weights = {
      reach: 0.25,
      engagement: 0.30,
      authority: 0.20,
      consistency: 0.15,
      growth: 0.10
    };

    const overallScore =
      metrics.reach * weights.reach +
      metrics.engagement * weights.engagement +
      metrics.authority * weights.authority +
      metrics.consistency * weights.consistency +
      metrics.growth * weights.growth;

    return {
      username: profile.username,
      platform: profile.platform,
      overallScore,
      metrics,
      category: this.categorizeInfluencer(profile)
    };
  }

  /**
   * Calculate reach score
   */
  private calculateReach(profile: SocialProfile): number {
    if (!profile.followers) return 0;

    // Logarithmic scale for reach
    const score = Math.log10(profile.followers + 1) / 7; // Max at 10M followers

    return Math.min(1, score);
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagement(profile: SocialProfile, posts: SocialPost[]): number {
    if (!profile.engagement || posts.length === 0) return 0;

    const avgEngagement =
      posts.reduce((sum, p) => sum + p.likes + p.comments * 2 + p.shares * 3, 0) /
      posts.length;

    const followers = profile.followers || 1;
    const engagementRate = avgEngagement / followers;

    // Typical good engagement is 3-5%
    return Math.min(1, engagementRate * 20);
  }

  /**
   * Calculate authority score
   */
  private calculateAuthority(profile: SocialProfile): number {
    let score = 0.3; // Base score

    // Verified badge
    if (profile.verified) {
      score += 0.4;
    }

    // Account age
    if (profile.createdAt) {
      const ageInYears =
        (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
      score += Math.min(0.2, ageInYears * 0.05);
    }

    // Profile completeness
    const completeness = [
      profile.bio,
      profile.location,
      profile.website,
      profile.profileImage
    ].filter(Boolean).length / 4;
    score += completeness * 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate posting consistency
   */
  private calculateConsistency(posts: SocialPost[]): number {
    if (posts.length < 5) return 0.5;

    const timestamps = posts.map(p => p.timestamp.getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sq, n) => sq + Math.pow(n - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = stdDev / avgInterval;

    // Lower CV = more consistent
    return Math.max(0, 1 - cv);
  }

  /**
   * Calculate growth score (estimated)
   */
  private calculateGrowth(profile: SocialProfile): number {
    // In production, would track historical follower counts
    // Here we estimate based on current metrics

    if (!profile.followers || !profile.posts) return 0.5;

    // Estimate growth based on posts/followers ratio
    const postsPerFollower = profile.posts / profile.followers;

    // Active accounts with good post frequency relative to followers
    if (postsPerFollower > 0.1) return 0.8;
    if (postsPerFollower > 0.01) return 0.6;
    return 0.4;
  }

  /**
   * Categorize influencer by follower count
   */
  private categorizeInfluencer(
    profile: SocialProfile
  ): 'nano' | 'micro' | 'macro' | 'mega' {
    const followers = profile.followers || 0;

    if (followers >= 1000000) return 'mega'; // 1M+
    if (followers >= 100000) return 'macro'; // 100K+
    if (followers >= 10000) return 'micro'; // 10K+
    return 'nano'; // < 10K
  }

  /**
   * Rank a list of influencers
   */
  rankInfluencers(scores: InfluencerScore[]): InfluencerScore[] {
    return scores
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((score, index) => ({
        ...score,
        rank: index + 1
      }));
  }
}
