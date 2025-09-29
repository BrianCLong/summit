import { buildManifest, Manifest } from '../src/domain/manifest.js';

test('merkle manifest builds deterministic root', async () => {
  const entries = [
    { path: 'exhibits/a.txt', size: 3, sha256: await Manifest.sha256('aaa') },
    { path: 'exhibits/b.txt', size: 3, sha256: await Manifest.sha256('bbb') }
  ];
  const m1 = await buildManifest(entries);
  const m2 = await buildManifest([...entries].reverse());
  expect(m1.root).toBe(m2.root);
  expect(m1.counts.files).toBe(2);
});
