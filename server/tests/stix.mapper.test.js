import { upsertStixBundle } from '../../src/connectors/stix/mapper';
import * as neo from '../../src/graph/neo4j';
test('maps indicator + relationship', async () => {
  const runs = [];
  jest.spyOn(neo, 'runCypher').mockImplementation(async (c, p) => {
    runs.push({ c, p });
    return [];
  });
  await upsertStixBundle(
    [
      {
        type: 'indicator',
        id: 'indicator--1',
        name: 'Suspicious IP',
        pattern: "[ipv4-addr:value = '1.2.3.4']",
      },
      { type: 'malware', id: 'malware--1', name: 'EvilWare' },
      {
        type: 'relationship',
        id: 'rel--1',
        source_ref: 'indicator--1',
        target_ref: 'malware--1',
        relationship_type: 'indicates',
      },
    ],
    'taxii:example',
  );
  expect(runs.some((r) => /MERGE \(e:Entity {stixId:\$id}\)/.test(r.c))).toBe(
    true,
  );
  expect(runs.some((r) => /MERGE \(a\)-\[r:RELATED_TO/.test(r.c))).toBe(true);
});
//# sourceMappingURL=stix.mapper.test.js.map
