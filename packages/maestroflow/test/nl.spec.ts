import { nlToFlow } from '../src/nl/translate';
import { flowLint } from '../src/lint';
test('nl→flow adds gate when confidence≥85', () => {
  const f = nlToFlow('On PR: build then test (TIA). Deploy if confidence≥85.');
  const ids = f.nodes.map((n: any) => n.id);
  expect(ids).toContain('gate');
  expect(flowLint(f).find((x) => x.level === 'error')).toBeFalsy();
});
