import { describe, it, expect } from 'vitest';
import { CrossDomainLinker, Incident, Narrative } from './cross-domain-linker';
import fs from 'fs';
import path from 'path';

interface Fixture {
  incidents: Incident[];
  narratives: Narrative[];
}

describe('CrossDomainLinker', () => {
  it('should link incident with narrative within time window', () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/incidents/leak_then_narrative.json');
    const fixture: Fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    const linker = new CrossDomainLinker(48 * 60 * 60 * 1000);
    const linkages = linker.link(fixture.incidents, fixture.narratives);

    expect(linkages).toHaveLength(1);
    const link = linkages[0];

    expect(link.incidentId).toBe('inc-1');
    expect(link.narrativeId).toBe('nar-1');
    expect(link.score).toBeGreaterThan(0.4); // Should be high due to keyword match
  });

  it('should not link unrelated narratives', () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/incidents/leak_then_narrative.json');
    const fixture: Fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    // Test narrative nar-2 is "Unrelated celebrity gossip"
    // Time diff is > 48h (T+200000s = ~55h)

    const linker = new CrossDomainLinker(48 * 60 * 60 * 1000);
    const linkages = linker.link(fixture.incidents, fixture.narratives);

    const relatedLink = linkages.find(l => l.narrativeId === 'nar-2');
    expect(relatedLink).toBeUndefined();
  });
});
