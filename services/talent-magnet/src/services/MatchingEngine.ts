import { v4 as uuidv4 } from 'uuid';
import {
  TalentProfile,
  Skill,
  TalentSignal,
  MatchCriteria,
  SkillLevel,
} from '../models/types.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('MatchingEngine');

interface MatchResult {
  talentId: string;
  matchScore: number;
  skillMatches: SkillMatch[];
  signalStrength: number;
  recommendation: string;
}

interface SkillMatch {
  skill: string;
  required: boolean;
  matched: boolean;
  level: string;
  gap: number;
}

const SKILL_LEVEL_VALUES: Record<string, number> = {
  [SkillLevel.BEGINNER]: 1,
  [SkillLevel.INTERMEDIATE]: 2,
  [SkillLevel.ADVANCED]: 3,
  [SkillLevel.EXPERT]: 4,
  [SkillLevel.THOUGHT_LEADER]: 5,
};

export class MatchingEngine {
  /**
   * Calculate match score between talent and criteria
   */
  calculateMatch(
    talent: TalentProfile,
    criteria: MatchCriteria,
  ): MatchResult {
    const skillMatches = this.evaluateSkills(talent.skills, criteria);
    const signalStrength = this.evaluateSignals(talent.signals);

    // Weighted scoring
    const skillScore = this.calculateSkillScore(skillMatches);
    const signalScore = signalStrength * 100;

    // 60% skills, 30% signals, 10% other factors
    const matchScore = Math.round(
      skillScore * 0.6 + signalScore * 0.3 + talent.overallScore * 0.1,
    );

    const recommendation = this.generateRecommendation(
      matchScore,
      skillMatches,
      criteria.urgency,
    );

    logger.debug({ talentId: talent.id, matchScore }, 'Match calculated');

    return {
      talentId: talent.id,
      matchScore: Math.min(100, matchScore),
      skillMatches,
      signalStrength,
      recommendation,
    };
  }

  /**
   * Rank multiple talents against criteria
   */
  rankTalents(
    talents: TalentProfile[],
    criteria: MatchCriteria,
  ): MatchResult[] {
    const results = talents.map((talent) =>
      this.calculateMatch(talent, criteria),
    );

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Detect talent signals from external data
   */
  detectSignals(data: Record<string, unknown>): TalentSignal[] {
    const signals: TalentSignal[] = [];
    const now = new Date();

    // GitHub activity signal
    if (data.githubStars && Number(data.githubStars) > 100) {
      signals.push({
        id: uuidv4(),
        category: 'open_source',
        source: 'github',
        sourceUrl: data.githubUrl as string,
        title: 'High-impact open source contributor',
        score: Math.min(100, Number(data.githubStars) / 10),
        confidence: 0.9,
        detectedAt: now,
        metadata: { stars: data.githubStars },
      });
    }

    // Publication signal
    if (data.publications && Number(data.publications) > 5) {
      signals.push({
        id: uuidv4(),
        category: 'publications',
        source: 'academic',
        title: 'Published researcher',
        score: Math.min(100, Number(data.publications) * 10),
        confidence: 0.85,
        detectedAt: now,
        metadata: { count: data.publications },
      });
    }

    // Patent signal
    if (data.patents && Number(data.patents) > 0) {
      signals.push({
        id: uuidv4(),
        category: 'patents',
        source: 'patent_office',
        title: 'Patent holder',
        score: Math.min(100, Number(data.patents) * 25),
        confidence: 0.95,
        detectedAt: now,
        metadata: { count: data.patents },
      });
    }

    // Award signal
    if (data.awards && Array.isArray(data.awards)) {
      signals.push({
        id: uuidv4(),
        category: 'awards',
        source: 'verified',
        title: 'Award recipient',
        score: Math.min(100, data.awards.length * 20),
        confidence: 0.9,
        detectedAt: now,
        metadata: { awards: data.awards },
      });
    }

    logger.info({ signalCount: signals.length }, 'Signals detected');
    return signals;
  }

  private evaluateSkills(
    skills: Skill[],
    criteria: MatchCriteria,
  ): SkillMatch[] {
    const matches: SkillMatch[] = [];
    const skillMap = new Map(
      skills.map((s) => [s.name.toLowerCase(), s]),
    );

    // Check required skills
    for (const required of criteria.requiredSkills) {
      const skill = skillMap.get(required.toLowerCase());
      matches.push({
        skill: required,
        required: true,
        matched: !!skill,
        level: skill?.level || 'none',
        gap: skill ? 0 : 3,
      });
    }

    // Check preferred skills
    for (const preferred of criteria.preferredSkills || []) {
      const skill = skillMap.get(preferred.toLowerCase());
      matches.push({
        skill: preferred,
        required: false,
        matched: !!skill,
        level: skill?.level || 'none',
        gap: skill ? 0 : 2,
      });
    }

    return matches;
  }

  private evaluateSignals(signals: TalentSignal[]): number {
    if (signals.length === 0) return 0;

    const weightedSum = signals.reduce((sum, signal) => {
      return sum + signal.score * signal.confidence;
    }, 0);

    return Math.min(1, weightedSum / (signals.length * 100));
  }

  private calculateSkillScore(matches: SkillMatch[]): number {
    if (matches.length === 0) return 50;

    const requiredMatches = matches.filter((m) => m.required);
    const preferredMatches = matches.filter((m) => !m.required);

    const requiredScore =
      requiredMatches.length > 0
        ? (requiredMatches.filter((m) => m.matched).length /
            requiredMatches.length) *
          100
        : 100;

    const preferredScore =
      preferredMatches.length > 0
        ? (preferredMatches.filter((m) => m.matched).length /
            preferredMatches.length) *
          100
        : 50;

    // Required skills are weighted more heavily
    return requiredScore * 0.7 + preferredScore * 0.3;
  }

  private generateRecommendation(
    score: number,
    matches: SkillMatch[],
    urgency: string,
  ): string {
    const missingRequired = matches.filter(
      (m) => m.required && !m.matched,
    );

    if (score >= 85) {
      return 'Highly recommended - Proceed with immediate outreach';
    }
    if (score >= 70) {
      if (missingRequired.length === 0) {
        return 'Strong candidate - Schedule initial contact';
      }
      return `Good potential - Consider upskilling for: ${missingRequired.map((m) => m.skill).join(', ')}`;
    }
    if (score >= 50 && urgency === 'critical') {
      return 'Viable option for urgent needs - Fast-track assessment';
    }
    if (score >= 50) {
      return 'Monitor and nurture - Add to talent pipeline';
    }
    return 'Low priority - Keep in database for future opportunities';
  }
}

export const matchingEngine = new MatchingEngine();
