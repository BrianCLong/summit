import { extractNarrativesFromArtifacts } from '../pipeline/extractNarratives';
import { linkNarrativesToReality } from '../pipeline/linkToReality';
import { InMemoryCogBattleStorage } from '../storage';

describe('extract + link pipeline', () => {
  it('extracts a narrative and links it to a matching claim', async () => {
    const artifacts = [
      {
        id: 'artifact_0001',
        kind: 'post' as const,
        source: { platform: 'telegram', uri: 'https://example.local/a1' },
        observedAt: '2026-03-05T01:00:00.000Z',
        content: {
          text: 'Sanctions collapsing EU economy, GDP in crisis according to reports.',
        },
        provenance: {
          collector: 'collector-v1',
          collectedAt: '2026-03-05T01:00:00.000Z',
        },
      },
    ];

    const narratives = await extractNarrativesFromArtifacts(artifacts);
    expect(narratives.length).toBe(1);

    const links = await linkNarrativesToReality(
      new InMemoryCogBattleStorage(),
      narratives,
      [
        {
          id: 'claim_gdp',
          statement: 'EU GDP remains stable despite sanctions.',
          status: 'verified',
          confidence: 0.88,
          evidenceRefs: ['evidence_1'],
        },
      ],
    );

    expect(links.length).toBe(1);
    expect(links[0]?.claimId).toBe('claim_gdp');
  });
});
