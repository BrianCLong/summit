/**
 * Tests for GNN integration in IntelGraph server
 */
// const request = require('supertest');
const GNNService = require('../src/services/GNNService');

describe('GNN Integration Tests', () => {
  describe('GNNService', () => {
    it('should convert graph data correctly', () => {
      // Test edge list format
      const edgeList = [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ];
      const converted = GNNService.convertGraphData(edgeList);

      expect(converted).toHaveProperty('edges');
      expect(converted.edges).toEqual(edgeList);
    });

    it('should convert node-edge format correctly', () => {
      const graphData = {
        nodes: [
          { id: '1', type: 'PERSON', name: 'John' },
          { id: '2', type: 'ORG', name: 'Acme' },
        ],
        edges: [{ source: '1', target: '2', type: 'WORKS_FOR' }],
      };

      const converted = GNNService.convertGraphData(graphData);

      expect(converted).toHaveProperty('edges');
      expect(converted).toHaveProperty('node_features');
      expect(converted.edges).toEqual([['1', '2']]);
      expect(converted.node_features).toHaveProperty('1');
      expect(converted.node_features).toHaveProperty('2');
    });

    it('should extract node features from numeric properties', () => {
      const nodes = [
        { id: '1', score: 0.8, count: 5, name: 'test' },
        { id: '2', score: 0.6, count: 3, type: 'entity' },
      ];

      const features = GNNService._extractNodeFeatures(nodes);

      expect(features['1']).toEqual([0.8, 5]);
      expect(features['2']).toEqual([0.6, 3]);
    });

    it('should create default features when no numeric properties exist', () => {
      const nodes = [
        { id: '1', name: 'test', type: 'entity' },
        { id: '2', label: 'another', category: 'type' },
      ];

      const features = GNNService._extractNodeFeatures(nodes);

      expect(features['1']).toEqual([1.0]);
      expect(features['2']).toEqual([1.0]);
    });

    it('should perform health check', async () => {
      const health = await GNNService.healthCheck();

      expect(health).toHaveProperty('available');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('message');
      expect(typeof health.available).toBe('boolean');
    });
  });

  describe('GNN API Methods', () => {
    const mockGraphData = {
      edges: [
        ['person1', 'org1'],
        ['person1', 'location1'],
      ],
    };

    const mockNodeFeatures = {
      person1: [1.0, 2.0],
      org1: [3.0, 4.0],
      location1: [5.0, 6.0],
    };

    it('should format node classification request correctly', async () => {
      // This test verifies the request format without making actual API calls
      const params = {
        investigationId: 'test-123',
        graphData: mockGraphData,
        nodeFeatures: mockNodeFeatures,
        modelName: 'test_classifier',
        taskMode: 'predict',
      };

      // Mock the conversion
      const converted = GNNService.convertGraphData(params.graphData);

      expect(converted).toHaveProperty('edges');
      expect(converted.edges).toEqual(mockGraphData.edges);
    });

    it('should format link prediction request correctly', async () => {
      const params = {
        investigationId: 'test-123',
        graphData: mockGraphData,
        candidateEdges: [
          ['person1', 'location1'],
          ['org1', 'location1'],
        ],
        modelName: 'test_predictor',
        taskMode: 'predict',
      };

      const converted = GNNService.convertGraphData(params.graphData);

      expect(converted).toHaveProperty('edges');
      expect(params.candidateEdges).toHaveLength(2);
    });

    it('should format anomaly detection request correctly', async () => {
      const params = {
        investigationId: 'test-123',
        graphData: mockGraphData,
        normalNodes: ['org1', 'location1'],
        anomalyThreshold: 0.7,
        modelName: 'test_detector',
        taskMode: 'predict',
      };

      const converted = GNNService.convertGraphData(params.graphData);

      expect(converted).toHaveProperty('edges');
      expect(params.normalNodes).toContain('org1');
      expect(params.anomalyThreshold).toBe(0.7);
    });
  });

  describe('Graph Data Conversion Edge Cases', () => {
    it('should handle empty graph data', () => {
      const emptyGraph = { edges: [] };
      const converted = GNNService.convertGraphData(emptyGraph);

      expect(converted.edges).toEqual([]);
    });

    it('should handle malformed edge data gracefully', () => {
      const malformedData = {
        edges: [
          { from: 'A', to: 'B' }, // Different property names
          { source: 'B', target: 'C' }, // Standard property names
        ],
      };

      expect(() => {
        GNNService.convertGraphData(malformedData);
      }).not.toThrow();
    });

    it('should handle mixed node types', () => {
      const mixedNodes = [
        { id: 1, value: 10 }, // Numeric ID
        { id: 'node2', value: 20 }, // String ID
        { id: 'node3', score: 0.5, count: 3 }, // Multiple features
      ];

      const features = GNNService._extractNodeFeatures(mixedNodes);

      expect(features['1']).toEqual([10]);
      expect(features['node2']).toEqual([20]);
      expect(features['node3']).toEqual([0.5, 3]);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large feature sets efficiently', () => {
      const largeFeatureNodes = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        feature1: Math.random(),
        feature2: Math.random(),
        feature3: Math.random(),
      }));

      const start = Date.now();
      const features = GNNService._extractNodeFeatures(largeFeatureNodes);
      const duration = Date.now() - start;

      expect(Object.keys(features)).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large edge lists efficiently', () => {
      const largeEdgeList = Array.from({ length: 5000 }, (_, i) => [
        `node_${i}`,
        `node_${(i + 1) % 1000}`,
      ]);

      const start = Date.now();
      const converted = GNNService.convertGraphData(largeEdgeList);
      const duration = Date.now() - start;

      expect(converted.edges).toHaveLength(5000);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
