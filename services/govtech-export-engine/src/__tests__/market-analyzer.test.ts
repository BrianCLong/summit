import { MarketAnalyzer } from '../analyzers/market-analyzer.js';
import type { CountryProfile } from '../models/types.js';

describe('MarketAnalyzer', () => {
  const analyzer = new MarketAnalyzer();

  const sampleCountry: CountryProfile = {
    code: 'MT',
    name: 'Malta',
    region: 'EU',
    population: 500_000,
    gdpPerCapita: 32_000,
    infrastructure: {
      internetPenetration: 85,
      mobileSubscriptions: 600_000,
      digitalLiteracy: 'high',
      existingEgov: ['taxation'],
    },
    regulatory: {
      dataProtectionLaw: 'GDPR',
      eSignatureLaw: true,
      cloudPolicy: 'flexible',
      gdprCompliant: true,
    },
    localization: {
      officialLanguages: ['mt', 'en'],
      currencyCode: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Europe/Malta',
    },
    priorities: ['identity', 'business', 'healthcare'],
  };

  describe('analyzeMarket', () => {
    it('should return a market analysis with all required fields', () => {
      const analysis = analyzer.analyzeMarket(sampleCountry);

      expect(analysis.countryCode).toBe('MT');
      expect(analysis.readinessScore).toBeGreaterThan(0);
      expect(analysis.opportunityScore).toBeGreaterThan(0);
      expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.recommendedServices).toBeInstanceOf(Array);
      expect(analysis.barriers).toBeInstanceOf(Array);
      expect(analysis.enablers).toBeInstanceOf(Array);
    });

    it('should identify enablers for high-readiness countries', () => {
      const analysis = analyzer.analyzeMarket(sampleCountry);

      expect(analysis.enablers).toContain('Strong internet infrastructure');
      expect(analysis.enablers).toContain('GDPR compliance simplifies data protection alignment');
    });

    it('should recommend governance and identity as foundational services', () => {
      const analysis = analyzer.analyzeMarket(sampleCountry);

      expect(analysis.recommendedServices).toContain('governance');
      expect(analysis.recommendedServices).toContain('identity');
    });
  });

  describe('generateAdaptations', () => {
    it('should generate language adaptations for non-English languages', () => {
      const adaptations = analyzer.generateAdaptations(['X-Road'], sampleCountry);

      const languageAdaptation = adaptations.find(
        a => a.adaptationType === 'cultural' && a.description.includes('mt')
      );
      expect(languageAdaptation).toBeDefined();
    });

    it('should generate currency adaptation', () => {
      const adaptations = analyzer.generateAdaptations(['e-Tax'], sampleCountry);

      const currencyAdaptation = adaptations.find(
        a => a.description.includes('EUR')
      );
      expect(currencyAdaptation).toBeDefined();
    });
  });
});
