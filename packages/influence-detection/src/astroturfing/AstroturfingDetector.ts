/**
 * Astroturfing detection
 * Identifies fake grassroots campaigns and manufactured consensus
 */

export interface AstroturfingResult {
  campaignId: string;
  topic: string;
  astroturfingScore: number;
  authenticity: number;
  indicators: AstroturfingIndicator[];
  participants: string[];
  timeline: Date[];
}

export interface AstroturfingIndicator {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string[];
}

export interface CampaignActivity {
  accountId: string;
  posts: CampaignPost[];
  engagement: EngagementMetrics;
  accountMetrics: AccountMetrics;
}

export interface CampaignPost {
  id: string;
  timestamp: Date;
  content: string;
  hashtags: string[];
  mentions: string[];
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  reach: number;
}

export interface AccountMetrics {
  accountAge: number; // days
  followerCount: number;
  postHistory: number; // total posts
}

export class AstroturfingDetector {
  async detectAstroturfing(
    activities: CampaignActivity[],
    topic: string
  ): Promise<AstroturfingResult> {
    const indicators: AstroturfingIndicator[] = [];

    // Check for suspicious account profiles
    const profileIndicator = this.checkAccountProfiles(activities);
    if (profileIndicator) indicators.push(profileIndicator);

    // Check for coordinated messaging
    const messagingIndicator = this.checkCoordinatedMessaging(activities);
    if (messagingIndicator) indicators.push(messagingIndicator);

    // Check for artificial amplification
    const amplificationIndicator = this.checkArtificialAmplification(activities);
    if (amplificationIndicator) indicators.push(amplificationIndicator);

    // Check for sudden surge
    const surgeIndicator = this.checkSuddenSurge(activities);
    if (surgeIndicator) indicators.push(surgeIndicator);

    // Check for lack of organic engagement
    const organicIndicator = this.checkOrganicEngagement(activities);
    if (organicIndicator) indicators.push(organicIndicator);

    // Calculate scores
    const astroturfingScore = this.calculateAstroturfingScore(indicators);
    const authenticity = 1 - astroturfingScore;

    return {
      campaignId: this.generateCampaignId(topic),
      topic,
      astroturfingScore,
      authenticity,
      indicators,
      participants: activities.map(a => a.accountId),
      timeline: this.extractTimeline(activities),
    };
  }

  private checkAccountProfiles(
    activities: CampaignActivity[]
  ): AstroturfingIndicator | null {
    const suspiciousAccounts: string[] = [];

    for (const activity of activities) {
      const metrics = activity.accountMetrics;

      // New accounts with low follower counts
      if (metrics.accountAge < 30 && metrics.followerCount < 100) {
        suspiciousAccounts.push(activity.accountId);
      }

      // Accounts with very low post history
      if (metrics.postHistory < 10) {
        suspiciousAccounts.push(activity.accountId);
      }
    }

    if (suspiciousAccounts.length > activities.length * 0.3) {
      return {
        type: 'suspicious_profiles',
        description: `${suspiciousAccounts.length} accounts have suspicious profiles`,
        severity: 'high',
        evidence: [
          `${suspiciousAccounts.length}/${activities.length} accounts are new or have low activity`,
          'Many accounts created recently with minimal history',
        ],
      };
    }

    return null;
  }

  private checkCoordinatedMessaging(
    activities: CampaignActivity[]
  ): AstroturfingIndicator | null {
    const messages = activities.flatMap(a => a.posts.map(p => p.content));

    if (messages.length < 3) return null;

    // Check for identical or near-identical messages
    const similarities: number[] = [];

    for (let i = 0; i < messages.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 10, messages.length); j++) {
        const similarity = this.calculateSimilarity(messages[i], messages[j]);
        similarities.push(similarity);
      }
    }

    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    if (avgSimilarity > 0.7) {
      return {
        type: 'coordinated_messaging',
        description: 'High similarity in messaging suggests coordination',
        severity: 'high',
        evidence: [
          `Average message similarity: ${(avgSimilarity * 100).toFixed(1)}%`,
          'Many identical or near-identical posts detected',
        ],
      };
    }

    if (avgSimilarity > 0.5) {
      return {
        type: 'similar_messaging',
        description: 'Moderate similarity in messaging',
        severity: 'medium',
        evidence: [
          `Average message similarity: ${(avgSimilarity * 100).toFixed(1)}%`,
        ],
      };
    }

    return null;
  }

  private checkArtificialAmplification(
    activities: CampaignActivity[]
  ): AstroturfingIndicator | null {
    const suspiciousEngagement: string[] = [];

    for (const activity of activities) {
      const { likes, shares, reach } = activity.engagement;
      const { followerCount } = activity.accountMetrics;

      // Engagement disproportionate to follower count
      const engagementRate = (likes + shares) / Math.max(followerCount, 1);

      if (engagementRate > 10) {
        // 10x more engagement than followers
        suspiciousEngagement.push(activity.accountId);
      }

      // High reach with low followers
      if (reach > followerCount * 20) {
        suspiciousEngagement.push(activity.accountId);
      }
    }

    if (suspiciousEngagement.length > activities.length * 0.2) {
      return {
        type: 'artificial_amplification',
        description: 'Engagement metrics suggest artificial amplification',
        severity: 'high',
        evidence: [
          `${suspiciousEngagement.length} accounts show suspicious engagement patterns`,
          'Engagement disproportionate to organic follower base',
        ],
      };
    }

    return null;
  }

  private checkSuddenSurge(
    activities: CampaignActivity[]
  ): AstroturfingIndicator | null {
    const timestamps = activities.flatMap(a => a.posts.map(p => p.timestamp));

    if (timestamps.length < 10) return null;

    timestamps.sort((a, b) => a.getTime() - b.getTime());

    // Check if most activity happened in a short time window
    const firstTimestamp = timestamps[0];
    const lastTimestamp = timestamps[timestamps.length - 1];
    const timeSpan = lastTimestamp.getTime() - firstTimestamp.getTime();

    const hoursSpan = timeSpan / (1000 * 60 * 60);

    if (hoursSpan < 24 && timestamps.length > 50) {
      return {
        type: 'sudden_surge',
        description: 'Sudden surge of activity in short time period',
        severity: 'high',
        evidence: [
          `${timestamps.length} posts in ${hoursSpan.toFixed(1)} hours`,
          'Unnatural spike suggests coordinated campaign',
        ],
      };
    }

    return null;
  }

  private checkOrganicEngagement(
    activities: CampaignActivity[]
  ): AstroturfingIndicator | null {
    let totalLikes = 0;
    let totalShares = 0;
    let totalComments = 0;

    for (const activity of activities) {
      totalLikes += activity.engagement.likes;
      totalShares += activity.engagement.shares;
      totalComments += activity.engagement.comments;
    }

    const totalEngagement = totalLikes + totalShares + totalComments;
    const avgEngagement = totalEngagement / activities.length;

    // Low comments relative to likes/shares suggests inauthentic engagement
    const commentRatio = totalComments / Math.max(totalLikes + totalShares, 1);

    if (commentRatio < 0.05) {
      return {
        type: 'low_organic_engagement',
        description: 'Low comment ratio suggests inauthentic engagement',
        severity: 'medium',
        evidence: [
          `Comment ratio: ${(commentRatio * 100).toFixed(2)}%`,
          'Real campaigns typically have higher comment engagement',
        ],
      };
    }

    return null;
  }

  private calculateAstroturfingScore(indicators: AstroturfingIndicator[]): number {
    if (indicators.length === 0) return 0;

    const weights = {
      low: 0.2,
      medium: 0.4,
      high: 0.6,
    };

    let totalScore = 0;
    for (const indicator of indicators) {
      totalScore += weights[indicator.severity];
    }

    return Math.min(totalScore / 2, 1); // Normalize to 0-1
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private extractTimeline(activities: CampaignActivity[]): Date[] {
    const timestamps = activities.flatMap(a => a.posts.map(p => p.timestamp));
    return timestamps.sort((a, b) => a.getTime() - b.getTime());
  }

  private generateCampaignId(topic: string): string {
    const hash = topic.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    return `astroturf_${Math.abs(hash).toString(36)}`;
  }
}
