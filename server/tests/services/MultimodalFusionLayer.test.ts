import MultimodalFusionLayer from '../../src/services/MultimodalFusionLayer.js';

describe('MultimodalFusionLayer', () => {
  const fusionLayer = new MultimodalFusionLayer({ embeddingSize: 16, similarityThreshold: 0.6 });

  test('generates multimodal embeddings with fused confidence', () => {
    const bundle = fusionLayer.generateEntityEmbeddings(
      {
        id: 'entity-1',
        label: 'Test Entity',
        description: 'Example entity spanning text and imagery',
        confidence: 0.8,
      },
      [
        {
          mediaType: 'IMAGE',
          filename: 'frame.png',
          metadata: { camera: 'drone-7' },
          quality: 'HIGH',
        },
      ],
    );

    expect(bundle.combined).toHaveLength(16);
    expect(bundle.modalities.length).toBeGreaterThanOrEqual(1);

    const confidence = fusionLayer.computeFusedConfidence(0.7, bundle.modalities, [0.9]);
    expect(confidence.overall).toBeGreaterThan(0.7);
    expect(confidence.breakdown.modalities.TEXT).toBeDefined();
  });

  test('infers correlations when embeddings align', () => {
    const bundle = fusionLayer.generateEntityEmbeddings({ id: 'a', label: 'Alpha', confidence: 0.85 }, []);
    const entityA = {
      id: 'a',
      label: 'Alpha',
      embedding: bundle.combined,
      confidence: 0.85,
      fusionConfidence: 0.85,
      mediaSources: [{ id: 'm1', mediaType: 'TEXT' }],
    };
    const entityB = {
      id: 'b',
      label: 'Alpha Evidence',
      embedding: bundle.combined,
      confidence: 0.82,
      fusionConfidence: 0.82,
      mediaSources: [{ id: 'm2', mediaType: 'IMAGE' }],
    };

    const correlations = fusionLayer.inferCorrelations([entityA, entityB], { similarityThreshold: 0.5 });
    expect(correlations).toHaveLength(1);
    expect(correlations[0].type).toBe('FUSED_CORRELATION');
    expect(correlations[0].sharedModalities).toBeInstanceOf(Array);
  });

  test('builds timeline events with deterministic ordering', () => {
    const entity = {
      id: 'timeline-1',
      label: 'Surveillance Capture',
      description: 'Detected convoy movement',
      fusionConfidence: 0.92,
      temporalBounds: [
        { mediaSourceId: 'm1', startTime: 5, endTime: 12, confidence: 0.8 },
        { mediaSourceId: 'm1', startTime: 18, endTime: 24, confidence: 0.75 },
      ],
      properties: { mission: 'Recon' },
      mediaSources: [{ id: 'm1', mediaType: 'VIDEO' }],
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };

    const timeline = fusionLayer.projectEntityTimeline(entity, { windowHours: 24 });
    expect(timeline).toHaveLength(2);
    expect(timeline[0].sequence).toBe(1);
    expect(timeline[0].timestamp).toBeInstanceOf(Date);
    expect(timeline[1].timestamp.getTime()).toBeGreaterThanOrEqual(
      timeline[0].timestamp.getTime(),
    );
  });
});
