import { lineageFor } from '../../src/lineage';

test('lineage hashes', () => {
  const l = lineageFor(Buffer.from('x'), ['trim'], 'fileA');
  expect(l.sha256).toHaveLength(64);
});
