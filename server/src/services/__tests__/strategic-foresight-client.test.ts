/**
 * Tests for Strategic Foresight Client
 */

import { StrategicForesightClient } from '../strategic-foresight-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('StrategicForesightClient', () => {
  let client: StrategicForesightClient;

  beforeEach(() => {
    client = new StrategicForesightClient({ baseUrl: 'http://test:8003' });
    mockFetch.mockReset();
  });

  describe('health', () => {
    it('should return health status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          service: 'strategic-foresight',
          timestamp: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await client.health();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('strategic-foresight');
    });
  });

  describe('analyze', () => {
    it('should perform foresight analysis', async () => {
      const mockResponse = {
        analysis_id: 'test_123',
        generated_at: '2024-01-01T00:00:00Z',
        domain: 'technology',
        trends: [
          {
            trend_id: 'trend_001',
            trend_type: 'technology',
            title: 'AI Adoption',
            description: 'Test description',
            confidence: 0.85,
            impact_score: 8.0,
            time_horizon: 'medium_term',
            key_drivers: ['driver1'],
            affected_sectors: ['tech'],
            recommended_actions: ['action1'],
            evidence_sources: ['source1'],
          },
        ],
        threats: [],
        partnerships: [],
        scenarios: [],
        recommendations: [],
        executive_summary: 'Test summary',
        processing_time_ms: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.analyze({
        domain: 'technology',
        focusAreas: ['AI'],
      });

      expect(result.analysisId).toBe('test_123');
      expect(result.domain).toBe('technology');
      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].trendType).toBe('TECHNOLOGY');
      expect(result.trends[0].timeHorizon).toBe('MEDIUM_TERM');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.analyze({ domain: 'test' })).rejects.toThrow(
        'Strategic Foresight API error: 500 Internal Server Error'
      );
    });
  });

  describe('getMarketTrends', () => {
    it('should return market trends', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            trend_id: 'trend_001',
            trend_type: 'market',
            title: 'Market Trend',
            description: 'Test',
            confidence: 0.9,
            impact_score: 7.5,
            time_horizon: 'short_term',
            key_drivers: [],
            affected_sectors: [],
            recommended_actions: [],
            evidence_sources: [],
          },
        ]),
      });

      const result = await client.getMarketTrends({
        domain: 'finance',
        timeHorizon: 'SHORT_TERM',
      });

      expect(result).toHaveLength(1);
      expect(result[0].trendType).toBe('MARKET');
      expect(result[0].timeHorizon).toBe('SHORT_TERM');
    });
  });

  describe('getCompetitiveThreats', () => {
    it('should return competitive threats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            threat_id: 'threat_001',
            competitor: 'CompetitorA',
            threat_level: 'high',
            threat_type: 'market_entry',
            description: 'Test threat',
            confidence: 0.8,
            time_to_impact: '6 months',
            indicators: [],
            countermeasures: [],
            affected_capabilities: [],
          },
        ]),
      });

      const result = await client.getCompetitiveThreats(
        ['CompetitorA'],
        'technology'
      );

      expect(result).toHaveLength(1);
      expect(result[0].threatLevel).toBe('HIGH');
      expect(result[0].competitor).toBe('CompetitorA');
    });
  });

  describe('getPartnershipOpportunities', () => {
    it('should return partnership opportunities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            opportunity_id: 'partner_001',
            partner: 'PartnerCo',
            opportunity_type: 'Technology Partnership',
            strategic_fit_score: 0.85,
            synergy_areas: ['AI'],
            potential_value: '$10M',
            risk_factors: [],
            recommended_approach: 'Joint venture',
            time_sensitivity: 'High',
          },
        ]),
      });

      const result = await client.getPartnershipOpportunities('technology', [
        'AI',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].strategicFitScore).toBe(0.85);
    });
  });

  describe('getPivotOpportunities', () => {
    it('should return pivot opportunities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            pivot_id: 'pivot_001',
            direction: 'Government Services',
            description: 'Pivot to government',
            feasibility_score: 0.75,
            market_potential: '$50B',
            capability_gap: ['Compliance'],
            timeline: '12 months',
            risks: ['Regulation'],
            success_factors: ['Partnerships'],
          },
        ]),
      });

      const result = await client.getPivotOpportunities({
        currentPosition: 'Enterprise',
        capabilities: ['AI'],
        marketSignals: ['Gov digitization'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].feasibilityScore).toBe(0.75);
    });
  });
});
