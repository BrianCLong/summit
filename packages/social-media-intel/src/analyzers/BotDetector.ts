/**
 * Bot Detector - Detects automated accounts and bots
 */

import type { BotScore, SocialProfile, SocialPost } from '../types/index.js';

export class BotDetector {
  /**
   * Analyze account for bot-like behavior
   */
  analyze(
    profile: SocialProfile,
    recentPosts: SocialPost[]
  ): BotScore {
    const indicators = {
      accountAge: this.analyzeAccountAge(profile),
      postFrequency: this.analyzePostFrequency(recentPosts),
      followRatio: this.analyzeFollowRatio(profile),
      profileCompleteness: this.analyzeProfileCompleteness(profile),
      contentDiversity: this.analyzeContentDiversity(recentPosts),
      timingPatterns: this.analyzeTimingPatterns(recentPosts),
      engagement: this.analyzeEngagement(profile, recentPosts)
    };

    // Calculate overall bot score
    const weights = {
      accountAge: 0.15,
      postFrequency: 0.20,
      followRatio: 0.15,
      profileCompleteness: 0.10,
      contentDiversity: 0.15,
      timingPatterns: 0.15,
      engagement: 0.10
    };

    let score = 0;
    for (const [key, value] of Object.entries(indicators)) {
      score += value * weights[key as keyof typeof weights];
    }

    // Determine classification
    let classification: 'human' | 'bot' | 'cyborg' | 'unknown' = 'unknown';
    if (score < 0.3) classification = 'human';
    else if (score > 0.7) classification = 'bot';
    else classification = 'cyborg';

    return {
      username: profile.username,
      platform: profile.platform,
      score,
      confidence: 0.8,
      indicators,
      classification
    };
  }

  /**
   * Analyze account age (newer = more suspicious)
   */
  private analyzeAccountAge(profile: SocialProfile): number {
    if (!profile.createdAt) return 0.5;

    const ageInDays = (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) return 0.9; // Very new
    if (ageInDays < 30) return 0.7; // New
    if (ageInDays < 90) return 0.4; // Recent
    if (ageInDays < 365) return 0.2; // Established
    return 0.1; // Old account
  }

  /**
   * Analyze posting frequency (too high or too regular = suspicious)
   */
  private analyzePostFrequency(posts: SocialPost[]): number {
    if (posts.length < 2) return 0.5;

    // Calculate average time between posts
    const timestamps = posts.map(p => p.timestamp.getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(
      intervals.reduce((sq, n) => sq + Math.pow(n - avgInterval, 2), 0) / intervals.length
    );

    // Very regular posting (low standard deviation) is suspicious
    const regularity = stdDev / avgInterval;

    if (regularity < 0.1) return 0.9; // Very regular = bot
    if (regularity < 0.3) return 0.6; // Quite regular
    return 0.2; // Natural variation
  }

  /**
   * Analyze follower/following ratio
   */
  private analyzeFollowRatio(profile: SocialProfile): number {
    if (!profile.followers || !profile.following) return 0.5;

    const ratio = profile.following / Math.max(1, profile.followers);

    // Bots typically follow many but have few followers
    if (ratio > 10) return 0.9;
    if (ratio > 5) return 0.7;
    if (ratio > 2) return 0.4;
    return 0.2;
  }

  /**
   * Analyze profile completeness
   */
  private analyzeProfileCompleteness(profile: SocialProfile): number {
    const hasFields = [
      profile.bio,
      profile.location,
      profile.website,
      profile.profileImage
    ].filter(Boolean).length;

    // Bots often have incomplete profiles
    const completeness = hasFields / 4;
    return 1 - completeness; // Invert: less complete = more bot-like
  }

  /**
   * Analyze content diversity
   */
  private analyzeContentDiversity(posts: SocialPost[]): number {
    if (posts.length < 2) return 0.5;

    // Check for repeated content
    const contents = posts.map(p => p.content);
    const unique = new Set(contents);

    const diversity = unique.size / contents.length;

    // Low diversity = suspicious
    if (diversity < 0.3) return 0.9;
    if (diversity < 0.6) return 0.6;
    return 0.2;
  }

  /**
   * Analyze posting time patterns
   */
  private analyzeTimingPatterns(posts: SocialPost[]): number {
    if (posts.length < 10) return 0.5;

    const hours = posts.map(p => p.timestamp.getHours());

    // Calculate distribution across 24 hours
    const distribution = new Array(24).fill(0);
    hours.forEach(h => distribution[h]++);

    // Calculate variance
    const avg = hours.length / 24;
    const variance = distribution.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 24;

    // Bots post at all hours with similar frequency (low variance)
    // Humans have peak hours (high variance)
    const normalizedVariance = Math.sqrt(variance) / avg;

    if (normalizedVariance < 0.5) return 0.8; // Very uniform = bot
    if (normalizedVariance < 1.0) return 0.5;
    return 0.2; // Natural variation
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagement(profile: SocialProfile, posts: SocialPost[]): number {
    if (posts.length === 0 || !profile.engagement) return 0.5;

    // Bots typically have low engagement
    const avgLikes = posts.reduce((sum, p) => sum + p.likes, 0) / posts.length;
    const avgComments = posts.reduce((sum, p) => sum + p.comments, 0) / posts.length;

    const totalEngagement = avgLikes + avgComments * 2; // Weight comments higher

    // Very low engagement relative to followers
    if (profile.followers && profile.followers > 0) {
      const engagementRate = totalEngagement / profile.followers;

      if (engagementRate < 0.001) return 0.9; // Very low
      if (engagementRate < 0.01) return 0.6;
      return 0.2; // Good engagement
    }

    return 0.5;
  }
}
