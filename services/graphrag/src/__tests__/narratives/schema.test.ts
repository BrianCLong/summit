import {
  NarrativeFrameSchema,
  NarrativeInfrastructureSchema,
} from '../../narratives/schema.js';
import {
  createInfrastructureFingerprint,
  createNarrativeFrameId,
  createNarrativeInfrastructureId,
} from '../../narratives/ids.js';

describe('narrative schema + ids', () => {
  it('creates deterministic frame ids with normalized inputs', () => {
    const baseInput = {
      blame_target: 'Institutional Actors',
      inevitability: 'MED' as const,
      solution_constraints: ['only_force_works', 'negotiation_impossible'],
      moral_vocab: ['Justice', 'Responsibility'],
      causal_template: 'If X happens, Y must follow',
    };

    const first = createNarrativeFrameId(baseInput);
    const second = createNarrativeFrameId({
      ...baseInput,
      blame_target: '  institutional  actors ',
      solution_constraints: [
        'negotiation_impossible',
        'only_force_works',
        '',
      ],
      moral_vocab: ['responsibility', 'justice'],
      causal_template: 'if x happens, y must follow',
    });

    expect(first).toEqual(second);
  });

  it('creates deterministic infrastructure fingerprints and ids', () => {
    const fingerprint = createInfrastructureFingerprint('Cause -> Effect', [
      'duty',
      'sacrifice',
    ]);
    const fingerprintSame = createInfrastructureFingerprint(' cause  ->  effect ', [
      'sacrifice',
      'duty',
    ]);

    expect(fingerprint).toEqual(fingerprintSame);

    const infraId = createNarrativeInfrastructureId({
      template_fingerprint: fingerprint,
      frame_ids: ['frame_b', 'frame_a'],
      topics_observed: ['crisis-b', 'crisis-a'],
    });

    const infraIdSame = createNarrativeInfrastructureId({
      template_fingerprint: fingerprintSame,
      frame_ids: ['frame_a', 'frame_b'],
      topics_observed: ['crisis-a', 'crisis-b'],
    });

    expect(infraId).toEqual(infraIdSame);
  });

  it('validates schema shapes for frames and infrastructure', () => {
    const frame = NarrativeFrameSchema.parse({
      frame_id: 'frame_1234',
      blame_target: 'test',
      inevitability: 'LOW',
      solution_constraints: ['constraint'],
      moral_vocab: ['value'],
      causal_template: 'template',
    });

    const infra = NarrativeInfrastructureSchema.parse({
      infrastructure_id: 'infra_1234',
      template_fingerprint: 'infra_fp_1234',
      frame_ids: [frame.frame_id],
      topics_observed: ['topic'],
    });

    expect(infra.frame_ids).toEqual([frame.frame_id]);
  });
});
