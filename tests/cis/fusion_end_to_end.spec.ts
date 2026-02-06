import { describe, it, expect } from 'vitest';
import { CIGBuilder } from '../../src/graphrag/cis/cig/builder';
import { PIEVectorEngine } from '../../src/graphrag/cis/pie/vector';
import { NarrativeItem, IntegritySignal } from '../../src/connectors/cis/plugins/types';

describe('CIS Fusion Logic', () => {
  it('should build CIG snapshot from narratives', () => {
    const narratives: NarrativeItem[] = [
      {
        narrative_id: 'n1',
        summary: 'Test Narrative',
        topics: ['t1'],
        actors: ['a1'],
        channels: ['c1'],
        risk_score: 0.8,
        provider: 'test',
        evidence_ids: []
      }
    ];

    const builder = new CIGBuilder();
    const snapshot = builder.buildFromNarratives(narratives);

    expect(snapshot.nodes).toHaveLength(4); // n1, a1, c1, t1
    expect(snapshot.edges).toHaveLength(3); // a1->n1, n1->c1, n1->t1

    const narrativeNode = snapshot.nodes.find(n => n.type === 'Narrative');
    expect(narrativeNode).toBeDefined();
    expect(narrativeNode?.properties.risk_score).toBe(0.8);
  });

  it('should compute PIE vectors from signals', () => {
    const engine = new PIEVectorEngine();
    const signal: IntegritySignal = {
      artifact_id: 'art1',
      artifact_hash: 'h1',
      modality: 'text',
      scores: { ai_generated: 0.8, manipulated: 0.1, spoof: 0 },
      confidence: 1.0,
      provider: 'test',
      model_id: 'm1',
      evidence_ids: []
    };

    engine.addSignal('user1', signal);
    const vector = engine.computeVector('user1');

    expect(vector.entity_id).toBe('user1');
    expect(vector.ai_content_ratio).toBeCloseTo(0.8);
    expect(vector.integrity_score).toBeCloseTo(0.2); // 1.0 - 0.8
  });
});
