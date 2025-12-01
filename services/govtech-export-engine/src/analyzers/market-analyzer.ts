import type {
  CountryProfile,
  MarketAnalysis,
  ServiceCategory,
  AdaptationRecommendation,
} from '../models/types.js';
import { EstoniaDigitalCatalog } from './estonia-catalog.js';

/**
 * Market Analyzer - Evaluates target countries for GovTech export readiness
 */
export class MarketAnalyzer {
  /**
   * Analyze a country's readiness for digital government solutions
   */
  analyzeMarket(country: CountryProfile): MarketAnalysis {
    const readinessScore = this.calculateReadinessScore(country);
    const opportunityScore = this.calculateOpportunityScore(country);
    const riskScore = this.calculateRiskScore(country);

    return {
      countryCode: country.code,
      readinessScore,
      opportunityScore,
      riskScore,
      recommendedServices: this.recommendServices(country),
      barriers: this.identifyBarriers(country),
      enablers: this.identifyEnablers(country),
      competitorPresence: this.assessCompetition(country),
      estimatedMarketSize: this.estimateMarketSize(country),
    };
  }

  private calculateReadinessScore(country: CountryProfile): number {
    let score = 0;

    // Internet penetration (max 25 points)
    score += (country.infrastructure.internetPenetration / 100) * 25;

    // Mobile subscriptions (max 15 points)
    const mobileRatio = Math.min(country.infrastructure.mobileSubscriptions / country.population, 1.5);
    score += (mobileRatio / 1.5) * 15;

    // Digital literacy (max 20 points)
    const literacyScores = { low: 5, medium: 12, high: 20 };
    score += literacyScores[country.infrastructure.digitalLiteracy];

    // Regulatory environment (max 25 points)
    if (country.regulatory.eSignatureLaw) score += 10;
    if (country.regulatory.gdprCompliant) score += 10;
    if (country.regulatory.cloudPolicy !== 'local_only') score += 5;

    // Existing e-gov infrastructure (max 15 points)
    score += Math.min(country.infrastructure.existingEgov.length * 3, 15);

    return Math.round(score);
  }

  private calculateOpportunityScore(country: CountryProfile): number {
    let score = 0;

    // Population size factor (larger = more opportunity, max 30 points)
    if (country.population > 100_000_000) score += 30;
    else if (country.population > 50_000_000) score += 25;
    else if (country.population > 10_000_000) score += 20;
    else if (country.population > 1_000_000) score += 15;
    else score += 10;

    // GDP per capita (higher = more budget, max 25 points)
    const gdp = country.gdpPerCapita || 10000;
    if (gdp > 40000) score += 25;
    else if (gdp > 25000) score += 20;
    else if (gdp > 15000) score += 15;
    else if (gdp > 8000) score += 10;
    else score += 5;

    // Gap analysis (fewer existing services = more opportunity, max 30 points)
    const serviceGap = 10 - country.infrastructure.existingEgov.length;
    score += Math.max(serviceGap * 3, 0);

    // Priority alignment (max 15 points)
    const priorityBonus = country.priorities.length * 3;
    score += Math.min(priorityBonus, 15);

    return Math.round(Math.min(score, 100));
  }

  private calculateRiskScore(country: CountryProfile): number {
    let risk = 0;

    // Data localization requirements (max 25 points)
    if (country.regulatory.cloudPolicy === 'local_only') risk += 25;
    else if (country.regulatory.cloudPolicy === 'regional') risk += 10;

    // Low digital literacy (max 20 points)
    const literacyRisk = { low: 20, medium: 10, high: 0 };
    risk += literacyRisk[country.infrastructure.digitalLiteracy];

    // Infrastructure gaps (max 30 points)
    if (country.infrastructure.internetPenetration < 50) risk += 30;
    else if (country.infrastructure.internetPenetration < 70) risk += 15;

    // Regulatory uncertainty (max 15 points)
    if (!country.regulatory.eSignatureLaw) risk += 10;
    if (!country.regulatory.dataProtectionLaw) risk += 5;

    // Language complexity (max 10 points)
    if (country.localization.officialLanguages.length > 2) risk += 10;

    return Math.round(Math.min(risk, 100));
  }

  private recommendServices(country: CountryProfile): ServiceCategory[] {
    const recommended: ServiceCategory[] = [];

    // Start with country's priorities
    recommended.push(...country.priorities);

    // Always recommend foundational services
    const foundational: ServiceCategory[] = ['governance', 'identity'];
    for (const f of foundational) {
      if (!recommended.includes(f)) {
        recommended.unshift(f);
      }
    }

    // Add complementary services based on existing infrastructure
    if (!country.infrastructure.existingEgov.includes('taxation')) {
      recommended.push('taxation');
    }
    if (!country.infrastructure.existingEgov.includes('business')) {
      recommended.push('business');
    }

    return [...new Set(recommended)].slice(0, 6);
  }

  private identifyBarriers(country: CountryProfile): string[] {
    const barriers: string[] = [];

    if (country.infrastructure.internetPenetration < 60) {
      barriers.push('Limited internet connectivity');
    }
    if (country.infrastructure.digitalLiteracy === 'low') {
      barriers.push('Low digital literacy requires extensive training programs');
    }
    if (country.regulatory.cloudPolicy === 'local_only') {
      barriers.push('Data localization requires local infrastructure investment');
    }
    if (!country.regulatory.eSignatureLaw) {
      barriers.push('No e-signature legislation - legal framework needed');
    }
    if (country.localization.officialLanguages.length > 2) {
      barriers.push('Multi-language support increases localization costs');
    }

    return barriers;
  }

  private identifyEnablers(country: CountryProfile): string[] {
    const enablers: string[] = [];

    if (country.infrastructure.internetPenetration > 80) {
      enablers.push('Strong internet infrastructure');
    }
    if (country.infrastructure.mobileSubscriptions / country.population > 1) {
      enablers.push('High mobile penetration enables mobile-first approach');
    }
    if (country.regulatory.gdprCompliant) {
      enablers.push('GDPR compliance simplifies data protection alignment');
    }
    if (country.regulatory.eSignatureLaw) {
      enablers.push('Existing e-signature legal framework');
    }
    if (country.infrastructure.existingEgov.length > 0) {
      enablers.push('Existing digital services provide integration foundation');
    }

    return enablers;
  }

  private assessCompetition(country: CountryProfile): string[] {
    // Common GovTech competitors by region
    const competitors: Record<string, string[]> = {
      EU: ['Accenture', 'Capgemini', 'T-Systems', 'Atos'],
      APAC: ['Huawei', 'NEC', 'Infosys', 'TCS'],
      Americas: ['IBM', 'Microsoft', 'Oracle', 'SAP'],
      MEA: ['Huawei', 'Oracle', 'SAP', 'Regional integrators'],
    };

    return competitors[country.region] || ['Local system integrators'];
  }

  private estimateMarketSize(country: CountryProfile): number {
    // Rough estimate: $2-5 per capita for comprehensive e-gov
    const perCapita = (country.gdpPerCapita || 10000) > 20000 ? 5 : 2;
    return Math.round(country.population * perCapita);
  }

  /**
   * Generate adaptation recommendations for a target country
   */
  generateAdaptations(
    serviceNames: string[],
    country: CountryProfile
  ): AdaptationRecommendation[] {
    const recommendations: AdaptationRecommendation[] = [];

    for (const serviceName of serviceNames) {
      const service = EstoniaDigitalCatalog.find(s => s.name === serviceName);
      if (!service) continue;

      // Language adaptation
      for (const lang of country.localization.officialLanguages) {
        if (lang !== 'en' && lang !== 'et') {
          recommendations.push({
            serviceId: service.id,
            adaptationType: 'cultural',
            priority: 'high',
            description: `Translate and localize UI/UX for ${lang}`,
            estimatedEffort: 30,
            dependencies: [],
          });
        }
      }

      // Data localization
      if (country.regulatory.cloudPolicy === 'local_only') {
        recommendations.push({
          serviceId: service.id,
          adaptationType: 'infrastructure',
          priority: 'critical',
          description: 'Deploy on-premise or in-country cloud infrastructure',
          estimatedEffort: 60,
          dependencies: [],
        });
      }

      // Legal framework
      if (!country.regulatory.eSignatureLaw && service.category === 'identity') {
        recommendations.push({
          serviceId: service.id,
          adaptationType: 'legal',
          priority: 'critical',
          description: 'Develop e-signature legal framework and regulations',
          estimatedEffort: 180,
          dependencies: [],
        });
      }

      // Currency and date format
      recommendations.push({
        serviceId: service.id,
        adaptationType: 'technical',
        priority: 'medium',
        description: `Configure for ${country.localization.currencyCode} and ${country.localization.dateFormat} date format`,
        estimatedEffort: 5,
        dependencies: [],
      });
    }

    return recommendations;
  }
}
