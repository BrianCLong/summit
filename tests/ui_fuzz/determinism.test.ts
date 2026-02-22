import { hashObject, stableStringify } from '../../tools/ui_fuzz/src/determinism.js';

const sampleTrace = [
  { step: 0, type: 'click', selector: 'html > body:nth-of-type(1) > button:nth-of-type(1)' },
  { step: 1, type: 'type', selector: 'input:nth-of-type(1)', inputLength: 5 },
];

describe('ui fuzz determinism helpers', () => {
  it('stableStringify orders keys deterministically', () => {
    const payload = { b: 2, a: 1 };
    expect(stableStringify(payload)).toBe('{"a":1,"b":2}');
  });

  it('hashObject is stable for equivalent inputs', () => {
    const first = hashObject(sampleTrace);
    const second = hashObject(JSON.parse(JSON.stringify(sampleTrace)));
    expect(first).toBe(second);
  });
});
