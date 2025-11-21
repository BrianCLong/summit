/**
 * Market Expansion Service
 *
 * Blitz-scale market expansion capabilities for rapid global deployment.
 * Enables overnight market entry with compliant, localized integrations.
 */

import type {
  GlobalPartner,
  MarketRegion,
  PartnerType,
  ComplianceFramework,
  MarketExpansionPlan,
  IntegrationMetrics,
} from './types';

export interface MarketProfile {
  region: MarketRegion;
  countries: CountryProfile[];
  languages: string[];
  complianceFrameworks: ComplianceFramework[];
  digitalInfrastructure: DigitalInfrastructure;
  marketSize: MarketSize;
  entryBarriers: EntryBarrier[];
}

export interface CountryProfile {
  code: string;
  name: string;
  languages: string[];
  population: number;
  gdpPerCapita: number;
  digitalReadiness: number; // 0-100
  governmentDigitization: number; // 0-100
  primaryFrameworks: ComplianceFramework[];
  dataLocalization: boolean;
  keyPartnerTypes: PartnerType[];
}

export interface DigitalInfrastructure {
  hasXRoad: boolean;
  hasEIDAS: boolean;
  hasOpenBanking: boolean;
  hasOpenData: boolean;
  apiMaturity: 'nascent' | 'developing' | 'mature' | 'advanced';
}

export interface MarketSize {
  potentialPartners: number;
  governmentEntities: number;
  businesses: number;
  academicInstitutions: number;
  estimatedDataVolume: string;
}

export interface EntryBarrier {
  type: 'regulatory' | 'technical' | 'language' | 'cultural' | 'economic';
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ExpansionStrategy {
  phase: 'discovery' | 'pilot' | 'rollout' | 'scale';
  targetPartners: number;
  timeline: {
    start: Date;
    milestones: { name: string; date: Date }[];
    completion: Date;
  };
  resources: {
    estimated_cost: number;
    team_size: number;
    infrastructure: string[];
  };
  risks: { description: string; probability: number; impact: number; mitigation: string }[];
}

export class MarketExpansionService {
  private marketProfiles: Map<MarketRegion, MarketProfile> = new Map();
  private expansionPlans: Map<string, MarketExpansionPlan> = new Map();

  constructor() {
    this.initializeMarketProfiles();
  }

  /**
   * Initialize market profiles for all supported regions
   */
  private initializeMarketProfiles(): void {
    // Baltic region (Estonia, Latvia, Lithuania)
    this.marketProfiles.set('Baltic', {
      region: 'Baltic',
      countries: [
        {
          code: 'EE',
          name: 'Estonia',
          languages: ['et', 'en', 'ru'],
          population: 1_330_000,
          gdpPerCapita: 27_000,
          digitalReadiness: 95,
          governmentDigitization: 99,
          primaryFrameworks: ['GDPR', 'eIDAS', 'X-Road'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'LV',
          name: 'Latvia',
          languages: ['lv', 'en', 'ru'],
          population: 1_900_000,
          gdpPerCapita: 21_000,
          digitalReadiness: 75,
          governmentDigitization: 80,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'LT',
          name: 'Lithuania',
          languages: ['lt', 'en', 'ru'],
          population: 2_800_000,
          gdpPerCapita: 23_000,
          digitalReadiness: 78,
          governmentDigitization: 82,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business', 'academia'],
        },
      ],
      languages: ['et', 'lv', 'lt', 'en', 'ru'],
      complianceFrameworks: ['GDPR', 'eIDAS', 'X-Road'],
      digitalInfrastructure: {
        hasXRoad: true,
        hasEIDAS: true,
        hasOpenBanking: true,
        hasOpenData: true,
        apiMaturity: 'advanced',
      },
      marketSize: {
        potentialPartners: 500,
        governmentEntities: 200,
        businesses: 250,
        academicInstitutions: 50,
        estimatedDataVolume: '10TB',
      },
      entryBarriers: [
        {
          type: 'language',
          description: 'Multiple local languages required',
          severity: 'medium',
          mitigation: 'Leverage automated translation with local review',
        },
      ],
    });

    // Nordic region
    this.marketProfiles.set('Nordic', {
      region: 'Nordic',
      countries: [
        {
          code: 'FI',
          name: 'Finland',
          languages: ['fi', 'sv', 'en'],
          population: 5_500_000,
          gdpPerCapita: 50_000,
          digitalReadiness: 92,
          governmentDigitization: 95,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business', 'academia'],
        },
        {
          code: 'SE',
          name: 'Sweden',
          languages: ['sv', 'en'],
          population: 10_400_000,
          gdpPerCapita: 52_000,
          digitalReadiness: 90,
          governmentDigitization: 88,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'NO',
          name: 'Norway',
          languages: ['no', 'en'],
          population: 5_400_000,
          gdpPerCapita: 65_000,
          digitalReadiness: 88,
          governmentDigitization: 85,
          primaryFrameworks: ['GDPR'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'DK',
          name: 'Denmark',
          languages: ['da', 'en'],
          population: 5_800_000,
          gdpPerCapita: 60_000,
          digitalReadiness: 91,
          governmentDigitization: 90,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
      ],
      languages: ['fi', 'sv', 'no', 'da', 'en'],
      complianceFrameworks: ['GDPR', 'eIDAS'],
      digitalInfrastructure: {
        hasXRoad: true,
        hasEIDAS: true,
        hasOpenBanking: true,
        hasOpenData: true,
        apiMaturity: 'advanced',
      },
      marketSize: {
        potentialPartners: 2000,
        governmentEntities: 600,
        businesses: 1200,
        academicInstitutions: 200,
        estimatedDataVolume: '100TB',
      },
      entryBarriers: [
        {
          type: 'cultural',
          description: 'High expectations for data privacy',
          severity: 'low',
          mitigation: 'Strong GDPR compliance already in place',
        },
      ],
    });

    // EU region (core EU countries)
    this.marketProfiles.set('EU', {
      region: 'EU',
      countries: [
        {
          code: 'DE',
          name: 'Germany',
          languages: ['de', 'en'],
          population: 83_000_000,
          gdpPerCapita: 46_000,
          digitalReadiness: 75,
          governmentDigitization: 65,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: true,
          keyPartnerTypes: ['government', 'business', 'academia'],
        },
        {
          code: 'FR',
          name: 'France',
          languages: ['fr', 'en'],
          population: 67_000_000,
          gdpPerCapita: 40_000,
          digitalReadiness: 72,
          governmentDigitization: 70,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'NL',
          name: 'Netherlands',
          languages: ['nl', 'en'],
          population: 17_500_000,
          gdpPerCapita: 53_000,
          digitalReadiness: 88,
          governmentDigitization: 85,
          primaryFrameworks: ['GDPR', 'eIDAS'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
      ],
      languages: ['de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'en'],
      complianceFrameworks: ['GDPR', 'eIDAS', 'ISO27001'],
      digitalInfrastructure: {
        hasXRoad: false,
        hasEIDAS: true,
        hasOpenBanking: true,
        hasOpenData: true,
        apiMaturity: 'mature',
      },
      marketSize: {
        potentialPartners: 50000,
        governmentEntities: 10000,
        businesses: 35000,
        academicInstitutions: 5000,
        estimatedDataVolume: '10PB',
      },
      entryBarriers: [
        {
          type: 'regulatory',
          description: 'Varying national implementations of EU directives',
          severity: 'medium',
          mitigation: 'Country-specific compliance modules',
        },
        {
          type: 'language',
          description: '20+ official languages',
          severity: 'high',
          mitigation: 'AI-powered translation with local validation',
        },
      ],
    });

    // North America
    this.marketProfiles.set('NA', {
      region: 'NA',
      countries: [
        {
          code: 'US',
          name: 'United States',
          languages: ['en', 'es'],
          population: 330_000_000,
          gdpPerCapita: 65_000,
          digitalReadiness: 85,
          governmentDigitization: 70,
          primaryFrameworks: ['SOC2', 'NIST', 'CCPA', 'HIPAA'],
          dataLocalization: false,
          keyPartnerTypes: ['business', 'academia', 'government'],
        },
        {
          code: 'CA',
          name: 'Canada',
          languages: ['en', 'fr'],
          population: 38_000_000,
          gdpPerCapita: 45_000,
          digitalReadiness: 82,
          governmentDigitization: 75,
          primaryFrameworks: ['SOC2', 'ISO27001'],
          dataLocalization: false,
          keyPartnerTypes: ['business', 'government'],
        },
      ],
      languages: ['en', 'es', 'fr'],
      complianceFrameworks: ['SOC2', 'NIST', 'CCPA', 'HIPAA', 'ISO27001'],
      digitalInfrastructure: {
        hasXRoad: false,
        hasEIDAS: false,
        hasOpenBanking: true,
        hasOpenData: true,
        apiMaturity: 'advanced',
      },
      marketSize: {
        potentialPartners: 100000,
        governmentEntities: 15000,
        businesses: 75000,
        academicInstitutions: 10000,
        estimatedDataVolume: '50PB',
      },
      entryBarriers: [
        {
          type: 'regulatory',
          description: 'State-level privacy laws (CCPA, CPRA, etc.)',
          severity: 'high',
          mitigation: 'Implement state-specific compliance modules',
        },
      ],
    });

    // APAC
    this.marketProfiles.set('APAC', {
      region: 'APAC',
      countries: [
        {
          code: 'JP',
          name: 'Japan',
          languages: ['ja', 'en'],
          population: 126_000_000,
          gdpPerCapita: 40_000,
          digitalReadiness: 78,
          governmentDigitization: 65,
          primaryFrameworks: ['ISO27001'],
          dataLocalization: true,
          keyPartnerTypes: ['business', 'government'],
        },
        {
          code: 'SG',
          name: 'Singapore',
          languages: ['en', 'zh', 'ms', 'ta'],
          population: 5_700_000,
          gdpPerCapita: 65_000,
          digitalReadiness: 92,
          governmentDigitization: 90,
          primaryFrameworks: ['ISO27001', 'SOC2'],
          dataLocalization: false,
          keyPartnerTypes: ['government', 'business'],
        },
        {
          code: 'AU',
          name: 'Australia',
          languages: ['en'],
          population: 26_000_000,
          gdpPerCapita: 55_000,
          digitalReadiness: 85,
          governmentDigitization: 80,
          primaryFrameworks: ['ISO27001', 'SOC2'],
          dataLocalization: true,
          keyPartnerTypes: ['government', 'business', 'academia'],
        },
      ],
      languages: ['en', 'zh', 'ja', 'ko'],
      complianceFrameworks: ['ISO27001', 'SOC2'],
      digitalInfrastructure: {
        hasXRoad: false,
        hasEIDAS: false,
        hasOpenBanking: true,
        hasOpenData: true,
        apiMaturity: 'mature',
      },
      marketSize: {
        potentialPartners: 30000,
        governmentEntities: 5000,
        businesses: 22000,
        academicInstitutions: 3000,
        estimatedDataVolume: '20PB',
      },
      entryBarriers: [
        {
          type: 'regulatory',
          description: 'Varying data localization requirements',
          severity: 'high',
          mitigation: 'Regional data centers with local processing',
        },
        {
          type: 'language',
          description: 'Complex character sets (CJK)',
          severity: 'medium',
          mitigation: 'Native language support with specialized NLP',
        },
      ],
    });
  }

  /**
   * Get market profile for a region
   */
  getMarketProfile(region: MarketRegion): MarketProfile | undefined {
    return this.marketProfiles.get(region);
  }

  /**
   * Analyze market opportunity
   */
  analyzeOpportunity(region: MarketRegion): {
    score: number;
    factors: { name: string; score: number; weight: number }[];
    recommendation: 'proceed' | 'cautious' | 'defer';
    reasoning: string;
  } {
    const profile = this.marketProfiles.get(region);
    if (!profile) {
      return {
        score: 0,
        factors: [],
        recommendation: 'defer',
        reasoning: 'Market profile not available',
      };
    }

    const factors = [
      {
        name: 'Digital Infrastructure',
        score: this.scoreInfrastructure(profile.digitalInfrastructure),
        weight: 0.25,
      },
      {
        name: 'Market Size',
        score: this.scoreMarketSize(profile.marketSize),
        weight: 0.20,
      },
      {
        name: 'Regulatory Alignment',
        score: this.scoreRegulatoryAlignment(profile.complianceFrameworks),
        weight: 0.25,
      },
      {
        name: 'Entry Barriers',
        score: this.scoreBarriers(profile.entryBarriers),
        weight: 0.15,
      },
      {
        name: 'Language Complexity',
        score: this.scoreLanguageComplexity(profile.languages),
        weight: 0.15,
      },
    ];

    const score = factors.reduce((total, f) => total + f.score * f.weight, 0);

    let recommendation: 'proceed' | 'cautious' | 'defer';
    let reasoning: string;

    if (score >= 75) {
      recommendation = 'proceed';
      reasoning = `${region} presents excellent opportunity with score ${score.toFixed(0)}. Strong digital infrastructure and favorable regulatory environment.`;
    } else if (score >= 50) {
      recommendation = 'cautious';
      reasoning = `${region} has moderate opportunity with score ${score.toFixed(0)}. Consider phased approach addressing key barriers.`;
    } else {
      recommendation = 'defer';
      reasoning = `${region} has significant barriers with score ${score.toFixed(0)}. Recommend deferring until conditions improve.`;
    }

    return { score, factors, recommendation, reasoning };
  }

  private scoreInfrastructure(infra: DigitalInfrastructure): number {
    let score = 0;
    if (infra.hasXRoad) score += 25;
    if (infra.hasEIDAS) score += 20;
    if (infra.hasOpenBanking) score += 15;
    if (infra.hasOpenData) score += 15;

    const maturityScores = { nascent: 5, developing: 10, mature: 20, advanced: 25 };
    score += maturityScores[infra.apiMaturity];

    return score;
  }

  private scoreMarketSize(size: MarketSize): number {
    const partnerScore = Math.min(size.potentialPartners / 1000, 50);
    const govScore = Math.min(size.governmentEntities / 200, 25);
    const academiaScore = Math.min(size.academicInstitutions / 100, 25);
    return partnerScore + govScore + academiaScore;
  }

  private scoreRegulatoryAlignment(frameworks: ComplianceFramework[]): number {
    let score = 50; // Base score for any compliance
    if (frameworks.includes('GDPR')) score += 15;
    if (frameworks.includes('eIDAS')) score += 15;
    if (frameworks.includes('X-Road')) score += 20;
    return Math.min(score, 100);
  }

  private scoreBarriers(barriers: EntryBarrier[]): number {
    if (barriers.length === 0) return 100;

    let penalty = 0;
    for (const barrier of barriers) {
      switch (barrier.severity) {
        case 'high':
          penalty += 30;
          break;
        case 'medium':
          penalty += 15;
          break;
        case 'low':
          penalty += 5;
          break;
      }
    }

    return Math.max(100 - penalty, 0);
  }

  private scoreLanguageComplexity(languages: string[]): number {
    // Fewer languages = easier = higher score
    if (languages.length <= 2) return 100;
    if (languages.length <= 5) return 75;
    if (languages.length <= 10) return 50;
    return 25;
  }

  /**
   * Create expansion plan for a region
   */
  async createExpansionPlan(
    targetRegion: MarketRegion,
    options: {
      targetPartnerTypes?: PartnerType[];
      targetCountries?: string[];
      timeline?: 'aggressive' | 'standard' | 'conservative';
    } = {}
  ): Promise<MarketExpansionPlan> {
    const profile = this.marketProfiles.get(targetRegion);
    if (!profile) {
      throw new Error(`Unknown market region: ${targetRegion}`);
    }

    const { targetPartnerTypes = ['government', 'business'], targetCountries, timeline = 'standard' } = options;

    const countries = targetCountries || profile.countries.map((c) => c.code);
    const languages = [...new Set(
      profile.countries
        .filter((c) => countries.includes(c.code))
        .flatMap((c) => c.languages)
    )];

    // Calculate timeline based on approach
    const now = new Date();
    const timelineMultiplier = { aggressive: 0.5, standard: 1, conservative: 2 };
    const baseMonths = { discovery: 1, integration: 2, activation: 1 };

    const multiplier = timelineMultiplier[timeline];
    const discoveryEnd = new Date(now.getTime() + baseMonths.discovery * multiplier * 30 * 24 * 60 * 60 * 1000);
    const integrationEnd = new Date(discoveryEnd.getTime() + baseMonths.integration * multiplier * 30 * 24 * 60 * 60 * 1000);
    const activationEnd = new Date(integrationEnd.getTime() + baseMonths.activation * multiplier * 30 * 24 * 60 * 60 * 1000);

    // Estimate partners
    const estimatedPartners = targetPartnerTypes.reduce((total, type) => {
      switch (type) {
        case 'government':
          return total + Math.floor(profile.marketSize.governmentEntities * (countries.length / profile.countries.length));
        case 'business':
          return total + Math.floor(profile.marketSize.businesses * (countries.length / profile.countries.length) * 0.1);
        case 'academia':
          return total + Math.floor(profile.marketSize.academicInstitutions * (countries.length / profile.countries.length));
        default:
          return total;
      }
    }, 0);

    const plan: MarketExpansionPlan = {
      id: `exp-${targetRegion.toLowerCase()}-${Date.now()}`,
      targetRegion,
      targetCountries: countries,
      partnerTypes: targetPartnerTypes,
      estimatedPartners,
      complianceRequirements: profile.complianceFrameworks,
      languagesRequired: languages,
      timeline: {
        discoveryPhase: discoveryEnd,
        integrationPhase: integrationEnd,
        activationPhase: activationEnd,
      },
      status: 'planning',
    };

    this.expansionPlans.set(plan.id, plan);
    return plan;
  }

  /**
   * Execute expansion plan
   */
  async executeExpansionPlan(
    planId: string,
    callbacks?: {
      onPhaseStart?: (phase: string) => void;
      onPartnerDiscovered?: (partner: GlobalPartner) => void;
      onProgress?: (progress: number) => void;
    }
  ): Promise<{
    success: boolean;
    partnersDiscovered: number;
    integrationsGenerated: number;
    integrationsActivated: number;
    errors: string[];
  }> {
    const plan = this.expansionPlans.get(planId);
    if (!plan) {
      throw new Error(`Expansion plan not found: ${planId}`);
    }

    const result = {
      success: true,
      partnersDiscovered: 0,
      integrationsGenerated: 0,
      integrationsActivated: 0,
      errors: [] as string[],
    };

    try {
      // Phase 1: Discovery
      plan.status = 'executing';
      this.expansionPlans.set(planId, plan);
      callbacks?.onPhaseStart?.('discovery');

      // Simulate discovery
      await this.delay(100);
      result.partnersDiscovered = Math.floor(plan.estimatedPartners * 0.8);
      callbacks?.onProgress?.(33);

      // Phase 2: Integration generation
      callbacks?.onPhaseStart?.('integration');
      await this.delay(100);
      result.integrationsGenerated = Math.floor(result.partnersDiscovered * 0.9);
      callbacks?.onProgress?.(66);

      // Phase 3: Activation
      callbacks?.onPhaseStart?.('activation');
      await this.delay(100);
      result.integrationsActivated = Math.floor(result.integrationsGenerated * 0.95);
      callbacks?.onProgress?.(100);

      plan.status = 'completed';
      this.expansionPlans.set(planId, plan);

    } catch (error) {
      result.success = false;
      result.errors.push(`Execution failed: ${error}`);
    }

    return result;
  }

  /**
   * Get expansion strategy for a region
   */
  getExpansionStrategy(region: MarketRegion): ExpansionStrategy {
    const profile = this.marketProfiles.get(region);
    const opportunity = this.analyzeOpportunity(region);

    const now = new Date();
    const phase = opportunity.score >= 75 ? 'rollout' : opportunity.score >= 50 ? 'pilot' : 'discovery';

    return {
      phase,
      targetPartners: profile?.marketSize.potentialPartners || 0,
      timeline: {
        start: now,
        milestones: [
          { name: 'Discovery Complete', date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          { name: 'Pilot Launch', date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
          { name: 'Full Rollout', date: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000) },
        ],
        completion: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
      resources: {
        estimated_cost: this.estimateCost(region),
        team_size: this.estimateTeamSize(region),
        infrastructure: this.getRequiredInfrastructure(region),
      },
      risks: this.assessRisks(region),
    };
  }

  private estimateCost(region: MarketRegion): number {
    const baseCosts: Record<MarketRegion, number> = {
      Baltic: 50000,
      Nordic: 100000,
      EU: 500000,
      NA: 750000,
      APAC: 400000,
      LATAM: 200000,
      MEA: 300000,
    };
    return baseCosts[region] || 100000;
  }

  private estimateTeamSize(region: MarketRegion): number {
    const profile = this.marketProfiles.get(region);
    if (!profile) return 2;

    if (profile.marketSize.potentialPartners > 10000) return 10;
    if (profile.marketSize.potentialPartners > 1000) return 5;
    return 2;
  }

  private getRequiredInfrastructure(region: MarketRegion): string[] {
    const infrastructure = ['API Gateway', 'Translation Service', 'Compliance Engine'];

    const profile = this.marketProfiles.get(region);
    if (profile?.digitalInfrastructure.hasXRoad) {
      infrastructure.push('X-Road Security Server');
    }

    if (profile?.countries.some((c) => c.dataLocalization)) {
      infrastructure.push(`Regional Data Center (${region})`);
    }

    return infrastructure;
  }

  private assessRisks(region: MarketRegion): ExpansionStrategy['risks'] {
    const profile = this.marketProfiles.get(region);
    const risks: ExpansionStrategy['risks'] = [];

    if (profile) {
      for (const barrier of profile.entryBarriers) {
        risks.push({
          description: barrier.description,
          probability: barrier.severity === 'high' ? 0.7 : barrier.severity === 'medium' ? 0.4 : 0.2,
          impact: barrier.severity === 'high' ? 8 : barrier.severity === 'medium' ? 5 : 2,
          mitigation: barrier.mitigation,
        });
      }
    }

    return risks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all supported regions
   */
  getSupportedRegions(): MarketRegion[] {
    return Array.from(this.marketProfiles.keys());
  }

  /**
   * Get expansion plan status
   */
  getExpansionPlanStatus(planId: string): MarketExpansionPlan | undefined {
    return this.expansionPlans.get(planId);
  }

  /**
   * List all expansion plans
   */
  listExpansionPlans(): MarketExpansionPlan[] {
    return Array.from(this.expansionPlans.values());
  }
}
