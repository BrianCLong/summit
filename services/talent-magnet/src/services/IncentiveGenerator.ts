import { v4 as uuidv4 } from 'uuid';
import {
  TalentProfile,
  IncentivePackage,
  IncentiveType,
  IncentiveTypeValue,
} from '../models/types.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('IncentiveGenerator');

interface IncentiveConfig {
  type: IncentiveTypeValue;
  baseValue: number;
  description: string;
  applicableConditions: (talent: TalentProfile) => boolean;
  calculateValue: (talent: TalentProfile, baseValue: number) => number;
}

const INCENTIVE_CONFIGS: IncentiveConfig[] = [
  {
    type: IncentiveType.RELOCATION_GRANT,
    baseValue: 5000,
    description: 'One-time relocation assistance grant',
    applicableConditions: (t) =>
      t.currentLocation !== 'Estonia' && t.currentLocation !== undefined,
    calculateValue: (t, base) => {
      // Higher for remote locations
      const multiplier = t.overallScore >= 80 ? 2 : 1.5;
      return Math.round(base * multiplier);
    },
  },
  {
    type: IncentiveType.TAX_BENEFIT,
    baseValue: 0,
    description: 'Special tax regime for foreign specialists (up to 50% reduction)',
    applicableConditions: (t) =>
      t.nationality !== 'Estonian' && t.overallScore >= 70,
    calculateValue: () => 0, // Tax benefit, no direct value
  },
  {
    type: IncentiveType.VISA_FAST_TRACK,
    baseValue: 0,
    description: 'Expedited visa processing (2 weeks instead of 2 months)',
    applicableConditions: (t) =>
      t.nationality !== 'Estonian' &&
      !['EU', 'EEA'].includes(t.nationality || ''),
    calculateValue: () => 0,
  },
  {
    type: IncentiveType.HOUSING_SUBSIDY,
    baseValue: 500,
    description: 'Monthly housing subsidy for first 6 months',
    applicableConditions: (t) => t.overallScore >= 75,
    calculateValue: (t, base) => {
      const months = 6;
      const multiplier = t.overallScore >= 90 ? 1.5 : 1;
      return Math.round(base * months * multiplier);
    },
  },
  {
    type: IncentiveType.RESEARCH_GRANT,
    baseValue: 25000,
    description: 'Research funding for innovative projects',
    applicableConditions: (t) =>
      t.signals.some(
        (s) => s.category === 'publications' || s.category === 'patents',
      ),
    calculateValue: (t, base) => {
      const researchSignals = t.signals.filter(
        (s) => s.category === 'publications' || s.category === 'patents',
      );
      const avgScore =
        researchSignals.reduce((sum, s) => sum + s.score, 0) /
        researchSignals.length;
      return Math.round(base * (avgScore / 50));
    },
  },
  {
    type: IncentiveType.STARTUP_FUNDING,
    baseValue: 50000,
    description: 'Seed funding for tech startups via Startup Estonia',
    applicableConditions: (t) =>
      t.overallScore >= 85 && t.skills.some((s) => s.level === 'expert'),
    calculateValue: (t, base) => {
      const expertSkills = t.skills.filter((s) => s.level === 'expert').length;
      return Math.round(base * (1 + expertSkills * 0.2));
    },
  },
  {
    type: IncentiveType.MENTORSHIP,
    baseValue: 0,
    description: 'Access to industry mentors and accelerator programs',
    applicableConditions: () => true,
    calculateValue: () => 0,
  },
  {
    type: IncentiveType.NETWORK_ACCESS,
    baseValue: 0,
    description: 'Membership to e-Residency community and tech networks',
    applicableConditions: () => true,
    calculateValue: () => 0,
  },
  {
    type: IncentiveType.UPSKILLING,
    baseValue: 3000,
    description: 'Training and certification budget',
    applicableConditions: (t) =>
      t.skills.some((s) => s.level === 'intermediate'),
    calculateValue: (t, base) => {
      const intermediateCount = t.skills.filter(
        (s) => s.level === 'intermediate',
      ).length;
      return Math.round(base * Math.min(intermediateCount, 3));
    },
  },
];

export class IncentiveGenerator {
  /**
   * Generate personalized incentive package for a talent
   */
  generatePackage(talent: TalentProfile): IncentivePackage {
    const applicableIncentives = INCENTIVE_CONFIGS.filter((config) =>
      config.applicableConditions(talent),
    );

    const incentives = applicableIncentives.map((config) => ({
      type: config.type,
      value: config.calculateValue(talent, config.baseValue),
      currency: 'EUR',
      description: config.description,
      validUntil: this.calculateValidUntil(talent.overallScore),
    }));

    const totalValue = incentives.reduce((sum, i) => sum + (i.value || 0), 0);

    const personalizationFactors = this.identifyPersonalizationFactors(talent);

    const pkg: IncentivePackage = {
      id: uuidv4(),
      talentId: talent.id,
      incentives,
      totalValue,
      currency: 'EUR',
      personalizationFactors,
      generatedAt: new Date(),
      expiresAt: this.calculatePackageExpiry(talent.overallScore),
    };

    logger.info(
      {
        talentId: talent.id,
        incentiveCount: incentives.length,
        totalValue,
      },
      'Incentive package generated',
    );

    return pkg;
  }

  /**
   * Adjust package based on talent feedback/preferences
   */
  adjustPackage(
    pkg: IncentivePackage,
    preferences: string[],
  ): IncentivePackage {
    const prioritizedIncentives = [...pkg.incentives].sort((a, b) => {
      const aPreferred = preferences.includes(a.type) ? 1 : 0;
      const bPreferred = preferences.includes(b.type) ? 1 : 0;
      return bPreferred - aPreferred;
    });

    return {
      ...pkg,
      incentives: prioritizedIncentives,
      personalizationFactors: [
        ...pkg.personalizationFactors,
        'preference_adjusted',
      ],
    };
  }

  private calculateValidUntil(score: number): Date {
    const daysValid = score >= 90 ? 90 : score >= 70 ? 60 : 30;
    const date = new Date();
    date.setDate(date.getDate() + daysValid);
    return date;
  }

  private calculatePackageExpiry(score: number): Date {
    const daysValid = score >= 85 ? 120 : score >= 70 ? 90 : 60;
    const date = new Date();
    date.setDate(date.getDate() + daysValid);
    return date;
  }

  private identifyPersonalizationFactors(talent: TalentProfile): string[] {
    const factors: string[] = [];

    if (talent.overallScore >= 90) factors.push('elite_tier');
    if (talent.overallScore >= 80) factors.push('high_potential');

    if (talent.signals.some((s) => s.category === 'open_source')) {
      factors.push('open_source_contributor');
    }
    if (talent.signals.some((s) => s.category === 'publications')) {
      factors.push('researcher');
    }
    if (talent.signals.some((s) => s.category === 'patents')) {
      factors.push('inventor');
    }

    if (talent.nationality && talent.nationality !== 'Estonian') {
      factors.push('international');
    }

    if (talent.skills.some((s) => s.level === 'thought_leader')) {
      factors.push('industry_leader');
    }

    return factors;
  }
}

export const incentiveGenerator = new IncentiveGenerator();
