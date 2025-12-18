/**
 * Bot detection using behavioral and content analysis
 * Identifies automated accounts and bot behavior patterns
 */

export interface BotDetectionResult {
  accountId: string;
  botScore: number;
  confidence: number;
  indicators: BotIndicator[];
  classification: 'human' | 'likely_human' | 'suspicious' | 'likely_bot' | 'bot';
}

export interface BotIndicator {
  type: string;
  description: string;
  score: number;
}

export interface AccountActivity {
  accountId: string;
  creationDate: Date;
  postCount: number;
  followerCount: number;
  followingCount: number;
  postingPattern: number[]; // Hourly posting distribution
  recentPosts: Post[];
}

export interface Post {
  id: string;
  timestamp: Date;
  content: string;
  engagement: number;
}

export class BotDetector {
  async detectBot(activity: AccountActivity): Promise<BotDetectionResult> {
    const indicators: BotIndicator[] = [];

    // Check account age
    const ageIndicator = this.checkAccountAge(activity);
    if (ageIndicator) indicators.push(ageIndicator);

    // Check posting frequency
    const frequencyIndicator = this.checkPostingFrequency(activity);
    if (frequencyIndicator) indicators.push(frequencyIndicator);

    // Check follower ratio
    const ratioIndicator = this.checkFollowerRatio(activity);
    if (ratioIndicator) indicators.push(ratioIndicator);

    // Check posting pattern
    const patternIndicator = this.checkPostingPattern(activity);
    if (patternIndicator) indicators.push(patternIndicator);

    // Check content similarity
    const similarityIndicator = this.checkContentSimilarity(activity);
    if (similarityIndicator) indicators.push(similarityIndicator);

    // Calculate overall bot score
    const botScore = this.calculateBotScore(indicators);
    const confidence = this.calculateConfidence(indicators);

    return {
      accountId: activity.accountId,
      botScore,
      confidence,
      indicators,
      classification: this.classify(botScore),
    };
  }

  async detectBotNetwork(activities: AccountActivity[]): Promise<string[][]> {
    const networks: string[][] = [];
    const processed = new Set<string>();

    for (const activity of activities) {
      if (processed.has(activity.accountId)) continue;

      const result = await this.detectBot(activity);
      if (result.botScore > 0.6) {
        // Find similar accounts (potential bot network)
        const network = this.findSimilarAccounts(activity, activities);
        if (network.length > 1) {
          networks.push(network.map(a => a.accountId));
          network.forEach(a => processed.add(a.accountId));
        }
      }
    }

    return networks;
  }

  private checkAccountAge(activity: AccountActivity): BotIndicator | null {
    const accountAge =
      (Date.now() - activity.creationDate.getTime()) / (1000 * 60 * 60 * 24);

    if (accountAge < 30 && activity.postCount > 100) {
      return {
        type: 'new_account_high_activity',
        description: 'New account with unusually high activity',
        score: 0.3,
      };
    }

    return null;
  }

  private checkPostingFrequency(activity: AccountActivity): BotIndicator | null {
    const accountAge =
      (Date.now() - activity.creationDate.getTime()) / (1000 * 60 * 60 * 24);
    const postsPerDay = activity.postCount / Math.max(accountAge, 1);

    if (postsPerDay > 50) {
      return {
        type: 'high_frequency',
        description: `Extremely high posting frequency: ${postsPerDay.toFixed(1)} posts/day`,
        score: 0.4,
      };
    }

    if (postsPerDay > 30) {
      return {
        type: 'elevated_frequency',
        description: `High posting frequency: ${postsPerDay.toFixed(1)} posts/day`,
        score: 0.2,
      };
    }

    return null;
  }

  private checkFollowerRatio(activity: AccountActivity): BotIndicator | null {
    if (activity.followerCount === 0 && activity.followingCount > 100) {
      return {
        type: 'zero_followers',
        description: 'No followers but following many accounts',
        score: 0.3,
      };
    }

    const ratio = activity.followingCount / Math.max(activity.followerCount, 1);

    if (ratio > 10) {
      return {
        type: 'poor_follower_ratio',
        description: `Following/follower ratio: ${ratio.toFixed(1)}:1`,
        score: 0.2,
      };
    }

    return null;
  }

  private checkPostingPattern(activity: AccountActivity): BotIndicator | null {
    // Check if posting pattern is too regular (non-human)
    const variance = this.calculateVariance(activity.postingPattern);

    if (variance < 0.1) {
      return {
        type: 'regular_pattern',
        description: 'Posting pattern is too regular for human behavior',
        score: 0.3,
      };
    }

    // Check for 24/7 posting (no sleep pattern)
    const hasNightActivity = activity.postingPattern.slice(0, 6).some(count => count > 0);
    const hasDayActivity = activity.postingPattern.slice(6, 22).some(count => count > 0);

    if (hasNightActivity && hasDayActivity) {
      const nightRatio =
        activity.postingPattern.slice(0, 6).reduce((a, b) => a + b, 0) /
        activity.postCount;

      if (nightRatio > 0.3) {
        return {
          type: '24_7_activity',
          description: 'Active 24/7 with no clear sleep pattern',
          score: 0.25,
        };
      }
    }

    return null;
  }

  private checkContentSimilarity(activity: AccountActivity): BotIndicator | null {
    if (activity.recentPosts.length < 5) {
      return null;
    }

    const similarities: number[] = [];

    for (let i = 0; i < activity.recentPosts.length - 1; i++) {
      for (let j = i + 1; j < activity.recentPosts.length; j++) {
        const similarity = this.calculateTextSimilarity(
          activity.recentPosts[i].content,
          activity.recentPosts[j].content
        );
        similarities.push(similarity);
      }
    }

    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    if (avgSimilarity > 0.8) {
      return {
        type: 'high_content_similarity',
        description: 'Posts are highly similar (copy-paste behavior)',
        score: 0.4,
      };
    }

    if (avgSimilarity > 0.6) {
      return {
        type: 'moderate_content_similarity',
        description: 'Posts show repetitive patterns',
        score: 0.2,
      };
    }

    return null;
  }

  private calculateBotScore(indicators: BotIndicator[]): number {
    if (indicators.length === 0) return 0;

    const totalScore = indicators.reduce((sum, ind) => sum + ind.score, 0);
    return Math.min(totalScore, 1);
  }

  private calculateConfidence(indicators: BotIndicator[]): number {
    // More indicators = higher confidence
    const indicatorConfidence = Math.min(indicators.length / 5, 1);
    return indicatorConfidence;
  }

  private classify(
    botScore: number
  ): 'human' | 'likely_human' | 'suspicious' | 'likely_bot' | 'bot' {
    if (botScore < 0.2) return 'human';
    if (botScore < 0.4) return 'likely_human';
    if (botScore < 0.6) return 'suspicious';
    if (botScore < 0.8) return 'likely_bot';
    return 'bot';
  }

  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;

    return variance;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private findSimilarAccounts(
    target: AccountActivity,
    allActivities: AccountActivity[]
  ): AccountActivity[] {
    const similar: AccountActivity[] = [target];

    for (const activity of allActivities) {
      if (activity.accountId === target.accountId) continue;

      // Check for similar posting patterns
      const patternSimilarity = this.comparePostingPatterns(
        target.postingPattern,
        activity.postingPattern
      );

      if (patternSimilarity > 0.8) {
        similar.push(activity);
      }
    }

    return similar;
  }

  private comparePostingPatterns(pattern1: number[], pattern2: number[]): number {
    if (pattern1.length !== pattern2.length) return 0;

    let similarity = 0;
    for (let i = 0; i < pattern1.length; i++) {
      const diff = Math.abs(pattern1[i] - pattern2[i]);
      similarity += 1 - diff / Math.max(pattern1[i], pattern2[i], 1);
    }

    return similarity / pattern1.length;
  }
}
