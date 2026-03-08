import fc from 'fast-check';
import { normalize } from '../lib/strings';

test('normalize is idempotent', () => {
  fc.assert(
    fc.property(fc.string(), (s) => normalize(normalize(s)) === normalize(s)),
  );
});
