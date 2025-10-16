import { BehavioralDnaNetwork } from '../src/ai/behavioralDnaNetwork';

describe('BehavioralDnaNetwork', () => {
  test('updates embeddings and detects anomalies', () => {
    const network = new BehavioralDnaNetwork();
    network.ingest({ entityId: 'u1', vector: [1, 0] });
    network.ingest({ entityId: 'u1', vector: [1, 0] });
    const result = network.ingest({ entityId: 'u1', vector: [0, 1] });

    expect(result.isAnomaly).toBe(true);
    const embedding = network.getEmbedding('u1');
    expect(embedding).toBeDefined();
  });

  test('predicts next behavior based on trend', () => {
    const network = new BehavioralDnaNetwork();
    network.ingest({ entityId: 'u2', vector: [1, 0] });
    network.ingest({ entityId: 'u2', vector: [0, 1] });
    const prediction = network.predictNext('u2');

    expect(prediction).toEqual([-1, 2]);
  });
});
