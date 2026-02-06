import { evId } from '../../src/narrative/evidence/ids';
import { InterpretiveDefault } from '../../src/narrative/schema/evidence_v1';

describe('Evidence Schema & IDs', () => {
  test('evId generates deterministic IDs', () => {
    const input = 'test-stable-input';
    const id1 = evId('default', input);
    const id2 = evId('default', input);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^ev:default:[a-f0-9]{12}$/);
  });

  test('evId changes with input', () => {
    const id1 = evId('default', 'input1');
    const id2 = evId('default', 'input2');
    expect(id1).not.toBe(id2);
  });

  test('Schema validation (type check only)', () => {
    const example: InterpretiveDefault = {
      default_id: evId('default', 'content'),
      assumption_type: 'presupposition',
      content: 'Example content',
      support_spans: [{ doc_id: '1', start: 0, end: 5, text: 'Examp' }],
      confidence: 0.9,
      rationale_template_id: 'tpl-1'
    };
    expect(example.assumption_type).toBe('presupposition');
  });
});
