
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { AdvancedCorrelationEngine } from '../AdvancedCorrelationEngine.js';
import EntityCorrelationEngine from '../../EntityCorrelationEngine.js';

// Mock EmbeddingService
const mockGenerateEmbeddings = jest.fn();
const mockEmbeddingService = {
  generateEmbeddings: mockGenerateEmbeddings,
  generateEmbedding: jest.fn(),
};

describe('AdvancedCorrelationEngine', () => {
  let engine: AdvancedCorrelationEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new AdvancedCorrelationEngine(
      mockEmbeddingService as any,
      new EntityCorrelationEngine()
    );
  });

  const createEntity = (id: string, label: string, timestamp?: string, embedding?: number[]) => ({
    id,
    label,
    source: 'test',
    attributes: {},
    timestamp,
    embedding
  });

  it('should group entities using vector similarity', async () => {
    const e1 = createEntity('1', 'Attack on Base A', undefined, [1, 0, 0]);
    const e2 = createEntity('2', 'Base A Assault', undefined, [0.9, 0.1, 0]); // Similar
    const e3 = createEntity('3', 'Picnic at Park', undefined, [0, 1, 0]); // Dissimilar

    mockGenerateEmbeddings.mockResolvedValue([]);

    const result = await engine.correlate([e1, e2, e3], { vectorThreshold: 0.8 });

    // Expect 2 groups: {e1, e2} and {e3}
    expect(result.length).toBe(2);

    const group1 = result.find(r => r.correlationMetadata.constituents.includes('1'));
    expect(group1.correlationMetadata.constituents).toContain('2');
    expect(group1.correlationMetadata.constituents).not.toContain('3');
  });

  it('should split groups based on temporal alignment', async () => {
    // Two events, textually identical, but far apart in time
    const t1 = '2023-01-01T10:00:00Z';
    const t2 = '2023-01-02T10:00:00Z'; // 24 hours later

    const e1 = createEntity('1', 'Fire', t1);
    const e2 = createEntity('2', 'Fire', t2);

    // Mock embeddings to be identical so vector sim doesn't split them
    mockGenerateEmbeddings.mockResolvedValue([[1,0], [1,0]]);

    // Time window 1 hour
    // Also use a very low vector threshold to ensure they are grouped initially solely by text/vector
    // The base engine groups them because labels are identical ("Fire").
    // We want the TEMPORAL logic to split them.
    const result = await engine.correlate([e1, e2], {
      timeWindowMs: 3600000,
      vectorThreshold: 0.0, // Force vector similarity to NOT separate them, relying on Temporal
    });

    // Should be split because > 1 hour apart
    expect(result.length).toBe(2);
  });

  it('should merge semantically similar groups', async () => {
    // Group 1: Cyber Attack
    const e1 = createEntity('1', 'DDoS', undefined, [1, 0, 0, 0]);

    // Group 2: Network Intrusion (Semantically close to DDoS)
    const e2 = createEntity('2', 'Packet Flood', undefined, [0.9, 0.1, 0, 0]);

    // Group 3: Baking (Different)
    const e3 = createEntity('3', 'Baking Cake', undefined, [0, 0, 1, 0]);

    const result = await engine.correlate([e1, e2, e3], {
      semanticThreshold: 0.8,
      vectorThreshold: 0.99 // Set high so they don't merge in step 2
    });

    // Should merge e1 and e2 due to semantic clustering
    const group1 = result.find(r => r.correlationMetadata.constituents.includes('1'));
    expect(group1.correlationMetadata.constituents).toContain('2');
    expect(result.length).toBe(2);
  });
});
