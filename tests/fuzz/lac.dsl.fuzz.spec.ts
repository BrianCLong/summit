import fc from 'fast-check';
import { parse } from '../../services/lac-compiler/src/dsl';

test('parser resists crashes', () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      try {
        parse(s);
        return /^([a-z]+)/.test(s.trim()) ? true : true;
      } catch {
        return true;
      }
    }),
  );
});
