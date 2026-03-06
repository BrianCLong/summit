import { PlaybookSynthesizer } from '../../src/graphrag/ren/playbooks/synthesize';
import { LegalEnvelopeValidator } from '../../src/graphrag/ren/playbooks/validate';
import { DEGF, RecommendedMove } from '../../src/graphrag/ren/ecf';

describe('Playbooks', () => {
  it('should synthesize playbooks from DEGF', () => {
    const synthesizer = new PlaybookSynthesizer();
    const degResult: DEGF = {
      recommended_moves: [{
        move_id: 'm1',
        move_type: 'redaction_request',
        rationale: 'Protect supply chain'
      }]
    } as any;

    const playbooks = synthesizer.synthesize(degResult);
    expect(playbooks.length).toBe(1);
    expect(playbooks[0].title).toContain('Supply Chain');
  });

  it('should validate legal envelope', () => {
    const validator = new LegalEnvelopeValidator();
    const validMoves: RecommendedMove[] = [{ move_id: '1', rationale: 'Redact PII' }] as any;
    expect(validator.validate(validMoves)).toBe(true);

    const invalidMoves: RecommendedMove[] = [{ move_id: '2', rationale: 'Hide evidence' }] as any;
    expect(() => validator.validate(invalidMoves)).toThrow('violates legal envelope');
  });
});
