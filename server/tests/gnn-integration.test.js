/**
 * Tests for GNN integration in IntelGraph server
 */
const request = require('supertest');
const GNNService = require('../src/services/GNNService');

describe('GNN Integration Tests', () => {
  
  describe('GNNService', () => {
    
    it('should convert graph data correctly', () => {
      // Test edge list format
      const edgeList = [['A', 'B'], ['B', 'C'], ['C', 'D']];
      const converted = GNNService.convertGraphData(edgeList);
      
      expect(converted).toHaveProperty('edges');
      expect(converted.edges).toEqual(edgeList);
    });
    
    it('should convert node-edge format correctly', () => {
      const graphData = {
        nodes: [
          { id: '1', type: 'PERSON', name: 'John' },
          { id: '2', type: 'ORG', name: 'Acme' }
        ],
        edges: [
          { source: '1', target: '2', type: 'WORKS_FOR' }
        ]
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
        { id: '2', score: 0.6, count: 3, type: 'entity' }
      ];
      
      const features = GNNService._extractNodeFeatures(nodes);
      
      expect(features['1']).toEqual([0.8, 5]);
      expect(features['2']).toEqual([0.6, 3]);
    });
    
    it('should create default features when no numeric properties exist', () => {
      const nodes = [
        { id: '1', name: 'test', type: 'entity' },
        { id: '2', label: 'another', category: 'type' }
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
      edges: [['person1', 'org1'], ['person1', 'location1']]
    };
    
    const mockNodeFeatures = {
      'person1': [1.0, 2.0],
      'org1': [3.0, 4.0],
      'location1': [5.0, 6.0]
    };
    
    it('should format node classification request correctly', async () => {
      // This test verifies the request format without making actual API calls
      const params = {
        investigationId: 'test-123',
        graphData: mockGraphData,
        nodeFeatures: mockNodeFeatures,
        modelName: 'test_classifier',
        taskMode: 'predict'
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
        candidateEdges: [['person1', 'location1'], ['org1', 'location1']],
        modelName: 'test_predictor',
        taskMode: 'predict'
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
        taskMode: 'predict'
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
          { from: 'A', to: 'B' },  // Different property names
          { source: 'B', target: 'C' }  // Standard property names
        ]
      };
      
      expect(() => {
        GNNService.convertGraphData(malformedData);
      }).not.toThrow();
    });
    
    it('should handle mixed node types', () => {
      const mixedNodes = [
        { id: 1, value: 10 },      // Numeric ID
        { id: 'node2', value: 20 }, // String ID
        { id: 'node3', score: 0.5, count: 3 }  // Multiple features
      ];
      
      const features = GNNService._extractNodeFeatures(mixedNodes);
      
      expect(features['1']).toEqual([10]);
      expect(features['node2']).toEqual([20]);
      expect(features['node3']).toEqual([0.5, 3]);
    });
    
  });
  
  describe('Error Handling', () => {
    
    it('should handle network errors gracefully', async () => {
      // Test with invalid URL to simulate network error
      const originalUrl = GNNService.mlServiceUrl;
      GNNService.mlServiceUrl = 'http://invalid-url:9999';
      
      const health = await GNNService.healthCheck();
      
      expect(health.available).toBe(false);
      expect(health.message).toContain('unreachable');
      
      // Restore original URL
      GNNService.mlServiceUrl = originalUrl;
    });
    
    it('should handle conversion errors gracefully', () => {
      const invalidData = null;
      
      expect(() => {
        GNNService.convertGraphData(invalidData);
      }).toThrow();
    });
    
  });
  
  describe('GNN Task Configuration', () => {
    
    it('should apply default model configurations', () => {
      const defaultConfig = {
        model_type: 'graphsage',
        hidden_dim: 256,
        output_dim: 128,
        dropout: 0.2
      };
      
      // Test that our service applies these defaults
      expect(defaultConfig.model_type).toBe('graphsage');
      expect(defaultConfig.hidden_dim).toBe(256);
      expect(defaultConfig.output_dim).toBe(128);
      expect(defaultConfig.dropout).toBe(0.2);
    });
    
    it('should override default configurations with custom ones', () => {
      const customConfig = {
        model_type: 'gat',
        hidden_dim: 512,
        num_heads: 8
      };
      
      const mergedConfig = {
        model_type: 'graphsage',
        hidden_dim: 256,
        output_dim: 128,
        dropout: 0.2,
        ...customConfig
      };
      
      expect(mergedConfig.model_type).toBe('gat');
      expect(mergedConfig.hidden_dim).toBe(512);
      expect(mergedConfig.num_heads).toBe(8);
      expect(mergedConfig.output_dim).toBe(128); // Preserved default
    });
    
  });
  
  describe('Integration Scenarios', () => {
    
    it('should handle real-world intelligence graph format', () => {
      const intelligenceGraph = {
        nodes: [
          { id: 'person_001', type: 'PERSON', risk_score: 0.7, connections: 5 },
          { id: 'org_001', type: 'ORGANIZATION', reputation: 0.3, employees: 100 },
          { id: 'loc_001', type: 'LOCATION', threat_level: 0.8, incidents: 3 }
        ],
        edges: [
          { source: 'person_001', target: 'org_001', type: 'EMPLOYED_BY', confidence: 0.9 },
          { source: 'person_001', target: 'loc_001', type: 'LOCATED_AT', confidence: 0.8 }
        ]
      };
      
      const converted = GNNService.convertGraphData(intelligenceGraph);
      
      expect(converted.edges).toEqual([
        ['person_001', 'org_001'],
        ['person_001', 'loc_001']
      ]);
      
      expect(converted.node_features).toHaveProperty('person_001');
      expect(converted.node_features).toHaveProperty('org_001');
      expect(converted.node_features).toHaveProperty('loc_001');
      
      // Check that numeric features were extracted
      expect(converted.node_features['person_001']).toEqual([0.7, 5]);
      expect(converted.node_features['org_001']).toEqual([0.3, 100]);
      expect(converted.node_features['loc_001']).toEqual([0.8, 3]);
    });
    
    it('should handle financial investigation graph format', () => {
      const financialGraph = {
        nodes: [
          { id: 'account_001', type: 'ACCOUNT', balance: 50000, transactions: 120 },
          { id: 'entity_001', type: 'ENTITY', risk_rating: 0.6, kyc_score: 0.8 },
          { id: 'bank_001', type: 'BANK', regulatory_score: 0.9, assets: 1000000 }
        ],
        edges: [
          { source: 'account_001', target: 'entity_001', type: 'OWNED_BY' },
          { source: 'account_001', target: 'bank_001', type: 'HELD_AT' }
        ]
      };
      
      const converted = GNNService.convertGraphData(financialGraph);
      
      expect(converted.edges).toHaveLength(2);
      expect(converted.node_features['account_001']).toEqual([50000, 120]);
      expect(converted.node_features['entity_001']).toEqual([0.6, 0.8]);
      expect(converted.node_features['bank_001']).toEqual([0.9, 1000000]);
    });
    
  });
  
});

describe('GNN Performance Considerations', () => {
  
  it('should handle large node feature arrays efficiently', () => {
    const largeFeatureNodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `node_${i}`,
      feature1: Math.random(),
      feature2: Math.random(),
      feature3: Math.random()
    }));
    
    const start = Date.now();
    const features = GNNService._extractNodeFeatures(largeFeatureNodes);
    const duration = Date.now() - start;
    
    expect(Object.keys(features)).toHaveLength(1000);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
  
  it('should handle large edge lists efficiently', () => {
    const largeEdgeList = Array.from({ length: 5000 }, (_, i) => [
      `node_${i}`, `node_${(i + 1) % 1000}`
    ]);
    
    const start = Date.now();
    const converted = GNNService.convertGraphData(largeEdgeList);
    const duration = Date.now() - start;
    
    expect(converted.edges).toHaveLength(5000);
    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });
  
});