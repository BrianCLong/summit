/**
 * Profile Analyzer - Enriches and analyzes social media profiles
 */

import type { SocialProfile } from '../types/index.js';

export class ProfileAnalyzer {
  /**
   * Enrich profile with additional analysis
   */
  analyzeProfile(profile: SocialProfile): {
    profile: SocialProfile;
    analysis: {
      completeness: number;
      credibility: number;
      activityLevel: 'low' | 'medium' | 'high';
      audienceQuality: number;
      riskFactors: string[];
    };
  } {
    const completeness = this.calculateCompleteness(profile);
    const credibility = this.calculateCredibility(profile);
    const activityLevel = this.assessActivityLevel(profile);
    const audienceQuality = this.calculateAudienceQuality(profile);
    const riskFactors = this.identifyRiskFactors(profile);

    return {
      profile,
      analysis: {
        completeness,
        credibility,
        activityLevel,
        audienceQuality,
        riskFactors
      }
    };
  }

  /**
   * Calculate profile completeness (0-1)
   */
  private calculateCompleteness(profile: SocialProfile): number {
    const fields = [
      profile.displayName,
      profile.bio,
      profile.location,
      profile.website,
      profile.profileImage,
      profile.verified
    ];

    const filledFields = fields.filter(f => f !== undefined && f !== null && f !== '');
    return filledFields.length / fields.length;
  }

  /**
   * Calculate credibility score (0-1)
   */
  private calculateCredibility(profile: SocialProfile): number {
    let score = 0.5; // Base score

    // Verified account
    if (profile.verified) {
      score += 0.3;
    }

    // Account age (if available)
    if (profile.createdAt) {
      const ageInDays = (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 365) score += 0.1;
      if (ageInDays > 730) score += 0.1;
    }

    // Complete profile
    if (this.calculateCompleteness(profile) > 0.8) {
      score += 0.1;
    }

    // Good engagement ratio
    if (profile.engagement && profile.engagement.engagementRate > 0.03) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess activity level
   */
  private assessActivityLevel(profile: SocialProfile): 'low' | 'medium' | 'high' {
    if (!profile.posts) return 'low';

    if (profile.posts > 1000) return 'high';
    if (profile.posts > 100) return 'medium';
    return 'low';
  }

  /**
   * Calculate audience quality (0-1)
   */
  private calculateAudienceQuality(profile: SocialProfile): number {
    if (!profile.followers || !profile.following) return 0.5;

    // Follower/following ratio
    const ratio = profile.followers / Math.max(1, profile.following);

    // Good ratio: more followers than following
    if (ratio > 1) return Math.min(1, 0.5 + (ratio / 10));

    // Poor ratio: following many more than followers
    return Math.max(0, 0.5 - (1 / ratio) * 0.2);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(profile: SocialProfile): string[] {
    const risks: string[] = [];

    // New account
    if (profile.createdAt) {
      const ageInDays = (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 30) {
        risks.push('Very new account');
      }
    }

    // Incomplete profile
    if (this.calculateCompleteness(profile) < 0.3) {
      risks.push('Incomplete profile');
    }

    // Suspicious follow ratio
    if (profile.followers && profile.following) {
      const ratio = profile.following / Math.max(1, profile.followers);
      if (ratio > 10) {
        risks.push('Suspicious follow ratio');
      }
    }

    // Low engagement
    if (profile.engagement && profile.engagement.engagementRate < 0.001) {
      risks.push('Low engagement rate');
    }

    // No profile image
    if (!profile.profileImage) {
      risks.push('No profile image');
    }

    return risks;
  }

  /**
   * Compare two profiles for potential correlation
   */
  compareProfiles(
    profile1: SocialProfile,
    profile2: SocialProfile
  ): {
    similarity: number;
    matches: string[];
  } {
    const matches: string[] = [];
    let score = 0;

    // Same display name
    if (profile1.displayName === profile2.displayName) {
      matches.push('display_name');
      score += 0.3;
    }

    // Similar username
    if (profile1.username.toLowerCase() === profile2.username.toLowerCase()) {
      matches.push('username');
      score += 0.4;
    }

    // Same location
    if (profile1.location && profile2.location && profile1.location === profile2.location) {
      matches.push('location');
      score += 0.1;
    }

    // Same website
    if (profile1.website && profile2.website && profile1.website === profile2.website) {
      matches.push('website');
      score += 0.2;
    }

    // Same email domain
    if (profile1.email && profile2.email) {
      const domain1 = profile1.email.split('@')[1];
      const domain2 = profile2.email.split('@')[1];
      if (domain1 === domain2) {
        matches.push('email_domain');
        score += 0.15;
      }
    }

    return {
      similarity: Math.min(1, score),
      matches
    };
  }
}
