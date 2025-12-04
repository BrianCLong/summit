/**
 * Unit tests for pattern mining templates
 */

import {
  detectCoTravelPatterns,
  detectFinancialStructuring,
  detectCommunicationBursts,
  type GraphData,
  type CoTravelOptions,
  type FinancialStructuringOptions,
  type CommunicationBurstOptions,
} from '../pattern-templates';

describe('Pattern Mining Templates', () => {
  describe('detectCoTravelPatterns', () => {
    it('should detect co-travel pattern when entities are co-located', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Person2',
            type: 'Person',
            location: { lat: 40.7130, lon: -74.0062 },
            timestamp: now + 1000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 1,
      };

      const result = detectCoTravelPatterns(graph, options);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].nodes).toContain('Person1');
      expect(result.patterns[0].nodes).toContain('Person2');
      expect(result.patterns[0].confidence).toBeGreaterThan(0);
    });

    it('should not detect pattern when entities are far apart', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Person2',
            type: 'Person',
            location: { lat: 34.0522, lon: -118.2437 }, // LA, far from NYC
            timestamp: now + 1000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 1,
      };

      const result = detectCoTravelPatterns(graph, options);

      expect(result.patterns.length).toBe(0);
    });

    it('should not detect pattern when time difference exceeds window', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Person2',
            type: 'Person',
            location: { lat: 40.7130, lon: -74.0062 },
            timestamp: now + 10000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 1,
      };

      const result = detectCoTravelPatterns(graph, options);

      expect(result.patterns.length).toBe(0);
    });

    it('should filter by entity types', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Vehicle1',
            type: 'Vehicle',
            location: { lat: 40.7130, lon: -74.0062 },
            timestamp: now + 1000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 1,
        entityTypes: ['Person'],
      };

      const result = detectCoTravelPatterns(graph, options);

      // Vehicle should be filtered out
      expect(result.patterns.length).toBe(0);
    });

    it('should require minimum co-occurrences', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Person2',
            type: 'Person',
            location: { lat: 40.7130, lon: -74.0062 },
            timestamp: now + 1000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 5,
      };

      const result = detectCoTravelPatterns(graph, options);

      // Only 1 co-occurrence, but require 5
      expect(result.patterns.length).toBe(0);
    });

    it('should include XAI explanations with feature importances', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          {
            id: 'Person1',
            type: 'Person',
            location: { lat: 40.7128, lon: -74.006 },
            timestamp: now,
          },
          {
            id: 'Person2',
            type: 'Person',
            location: { lat: 40.7130, lon: -74.0062 },
            timestamp: now + 1000,
          },
        ],
        edges: [],
      };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 100,
        minCoOccurrences: 1,
      };

      const result = detectCoTravelPatterns(graph, options);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].explanations).toBeDefined();
      expect(result.patterns[0].explanations.length).toBeGreaterThan(0);

      const explanation = result.patterns[0].explanations[0];
      expect(explanation.featureImportances).toBeDefined();
      expect(explanation.reasoning).toBeTruthy();
      expect(explanation.evidence).toBeDefined();
      expect(explanation.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('detectFinancialStructuring', () => {
    it('should detect fan-out pattern', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Account1', type: 'Account' },
          { id: 'Account2', type: 'Account' },
          { id: 'Account3', type: 'Account' },
          { id: 'Account4', type: 'Account' },
        ],
        edges: [
          {
            source: 'Account1',
            target: 'Account2',
            type: 'TRANSFER',
            timestamp: now,
            properties: { amount: 1000 },
          },
          {
            source: 'Account1',
            target: 'Account3',
            type: 'TRANSFER',
            timestamp: now + 1000,
            properties: { amount: 1000 },
          },
          {
            source: 'Account1',
            target: 'Account4',
            type: 'TRANSFER',
            timestamp: now + 2000,
            properties: { amount: 1000 },
          },
        ],
      };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 3,
        maxHops: 1,
        patternType: 'fan-out',
      };

      const result = detectFinancialStructuring(graph, options);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].metadata.patternType).toBe('fan-out');
      expect(result.patterns[0].metadata.centerNode).toBe('Account1');
      expect(result.patterns[0].metadata.branches).toBe(3);
    });

    it('should detect fan-in pattern', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Account1', type: 'Account' },
          { id: 'Account2', type: 'Account' },
          { id: 'Account3', type: 'Account' },
          { id: 'Account4', type: 'Account' },
        ],
        edges: [
          {
            source: 'Account2',
            target: 'Account1',
            type: 'TRANSFER',
            timestamp: now,
            properties: { amount: 1000 },
          },
          {
            source: 'Account3',
            target: 'Account1',
            type: 'TRANSFER',
            timestamp: now + 1000,
            properties: { amount: 1000 },
          },
          {
            source: 'Account4',
            target: 'Account1',
            type: 'TRANSFER',
            timestamp: now + 2000,
            properties: { amount: 1000 },
          },
        ],
      };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 3,
        maxHops: 1,
        patternType: 'fan-in',
      };

      const result = detectFinancialStructuring(graph, options);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].metadata.patternType).toBe('fan-in');
      expect(result.patterns[0].metadata.centerNode).toBe('Account1');
      expect(result.patterns[0].metadata.branches).toBe(3);
    });

    it('should respect amount threshold', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Account1', type: 'Account' },
          { id: 'Account2', type: 'Account' },
          { id: 'Account3', type: 'Account' },
          { id: 'Account4', type: 'Account' },
        ],
        edges: [
          {
            source: 'Account1',
            target: 'Account2',
            type: 'TRANSFER',
            timestamp: now,
            properties: { amount: 100 },
          },
          {
            source: 'Account1',
            target: 'Account3',
            type: 'TRANSFER',
            timestamp: now + 1000,
            properties: { amount: 100 },
          },
          {
            source: 'Account1',
            target: 'Account4',
            type: 'TRANSFER',
            timestamp: now + 2000,
            properties: { amount: 100 },
          },
        ],
      };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 3,
        maxHops: 1,
        patternType: 'fan-out',
        amountThreshold: 500,
      };

      const result = detectFinancialStructuring(graph, options);

      // All amounts are below threshold
      expect(result.patterns.length).toBe(0);
    });

    it('should include XAI explanations with feature importances', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Account1', type: 'Account' },
          { id: 'Account2', type: 'Account' },
          { id: 'Account3', type: 'Account' },
          { id: 'Account4', type: 'Account' },
        ],
        edges: [
          {
            source: 'Account1',
            target: 'Account2',
            type: 'TRANSFER',
            timestamp: now,
            properties: { amount: 1000 },
          },
          {
            source: 'Account1',
            target: 'Account3',
            type: 'TRANSFER',
            timestamp: now + 1000,
            properties: { amount: 1000 },
          },
          {
            source: 'Account1',
            target: 'Account4',
            type: 'TRANSFER',
            timestamp: now + 2000,
            properties: { amount: 1000 },
          },
        ],
      };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 3,
        maxHops: 1,
        patternType: 'fan-out',
      };

      const result = detectFinancialStructuring(graph, options);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0].explanations).toBeDefined();

      const explanation = result.patterns[0].explanations[0];
      expect(explanation.featureImportances).toBeDefined();
      expect(explanation.featureImportances!.branch_count).toBeGreaterThan(0);
    });

    it('should not detect pattern when branches below threshold', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Account1', type: 'Account' },
          { id: 'Account2', type: 'Account' },
        ],
        edges: [
          {
            source: 'Account1',
            target: 'Account2',
            type: 'TRANSFER',
            timestamp: now,
            properties: { amount: 1000 },
          },
        ],
      };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 5,
        maxHops: 1,
        patternType: 'fan-out',
      };

      const result = detectFinancialStructuring(graph, options);

      expect(result.patterns.length).toBe(0);
    });
  });

  describe('detectCommunicationBursts', () => {
    it('should detect communication burst', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges: Array.from({ length: 20 }, (_, i) => ({
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now + i * 100,
        })),
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 5000,
        burstThreshold: 2.0,
      };

      const result = detectCommunicationBursts(graph, options);

      expect(result.bursts.length).toBeGreaterThan(0);
      expect(result.bursts[0].metadata.burstRatio).toBeGreaterThan(2.0);
    });

    it('should detect communication lull', () => {
      const now = Date.now();
      const edges = [
        {
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now,
        },
        {
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now + 30000,
        },
      ];

      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges,
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 10000,
        burstThreshold: 2.0,
        lullThreshold: 0.3,
      };

      const result = detectCommunicationBursts(graph, options);

      expect(result.lulls.length).toBeGreaterThan(0);
    });

    it('should filter by communication type', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges: [
          ...Array.from({ length: 10 }, (_, i) => ({
            source: 'Person1',
            target: 'Person2',
            type: 'EMAIL',
            timestamp: now + i * 100,
          })),
          ...Array.from({ length: 10 }, (_, i) => ({
            source: 'Person1',
            target: 'Person2',
            type: 'CALL',
            timestamp: now + i * 100,
          })),
        ],
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 5000,
        burstThreshold: 2.0,
        communicationTypes: ['EMAIL'],
      };

      const result = detectCommunicationBursts(graph, options);

      // Should only analyze EMAIL messages
      expect(result.metadata.edgesAnalyzed).toBe(10);
    });

    it('should use provided baseline rate', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges: Array.from({ length: 20 }, (_, i) => ({
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now + i * 100,
        })),
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 5000,
        baselineRate: 5,
        burstThreshold: 2.0,
      };

      const result = detectCommunicationBursts(graph, options);

      expect(result.metadata.baselineRate).toBe(5);
    });

    it('should include XAI explanations with feature importances', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges: Array.from({ length: 20 }, (_, i) => ({
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now + i * 100,
        })),
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 5000,
        burstThreshold: 2.0,
      };

      const result = detectCommunicationBursts(graph, options);

      expect(result.bursts.length).toBeGreaterThan(0);
      expect(result.bursts[0].explanations).toBeDefined();

      const explanation = result.bursts[0].explanations[0];
      expect(explanation.featureImportances).toBeDefined();
      expect(explanation.featureImportances!.message_rate).toBeGreaterThan(0);
    });

    it('should handle empty graph', () => {
      const graph: GraphData = {
        nodes: [],
        edges: [],
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 5000,
        burstThreshold: 2.0,
      };

      const result = detectCommunicationBursts(graph, options);

      expect(result.bursts).toEqual([]);
      expect(result.lulls).toEqual([]);
      expect(result.metadata.edgesAnalyzed).toBe(0);
    });

    it('should respect minimum burst duration', () => {
      const now = Date.now();
      const graph: GraphData = {
        nodes: [
          { id: 'Person1' },
          { id: 'Person2' },
        ],
        edges: Array.from({ length: 20 }, (_, i) => ({
          source: 'Person1',
          target: 'Person2',
          type: 'MESSAGE',
          timestamp: now + i * 100,
        })),
      };

      const options: CommunicationBurstOptions = {
        timeWindow: 2000,
        burstThreshold: 2.0,
        minBurstDuration: 10000,
      };

      const result = detectCommunicationBursts(graph, options);

      // Bursts detected but filtered out due to duration
      expect(result.bursts.length).toBe(0);
    });
  });

  describe('Performance characteristics', () => {
    it('should complete co-travel detection in reasonable time', () => {
      const now = Date.now();
      const nodes = Array.from({ length: 50 }, (_, i) => ({
        id: `Person${i}`,
        type: 'Person',
        location: {
          lat: 40.7128 + (Math.random() - 0.5) * 0.01,
          lon: -74.006 + (Math.random() - 0.5) * 0.01,
        },
        timestamp: now + Math.random() * 10000,
      }));

      const graph: GraphData = { nodes, edges: [] };

      const options: CoTravelOptions = {
        timeWindow: 5000,
        distanceThreshold: 1000,
        minCoOccurrences: 1,
      };

      const start = performance.now();
      const result = detectCoTravelPatterns(graph, options);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      expect(result.executionTime).toBeLessThan(500);
    });

    it('should complete financial structuring detection in reasonable time', () => {
      const now = Date.now();
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `Account${i}`,
        type: 'Account',
      }));

      const edges = Array.from({ length: 200 }, (_, i) => ({
        source: `Account${i % 100}`,
        target: `Account${(i + 1) % 100}`,
        type: 'TRANSFER',
        timestamp: now + Math.random() * 100000,
        properties: { amount: Math.random() * 10000 },
      }));

      const graph: GraphData = { nodes, edges };

      const options: FinancialStructuringOptions = {
        timeWindow: 10000,
        minBranches: 3,
        maxHops: 1,
        patternType: 'both',
      };

      const start = performance.now();
      const result = detectFinancialStructuring(graph, options);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(result.executionTime).toBeLessThan(1000);
    });
  });
});
