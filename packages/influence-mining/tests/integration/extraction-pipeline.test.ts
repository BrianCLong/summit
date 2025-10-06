import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { InfluenceNetworkExtractor } from '../../src/InfluenceNetworkExtractor.js';
import { SourceData } from '../../src/types.js';

describe('Influence network extraction pipeline', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, '../../test-data/sample-social-posts.json');
  const expectedPath = path.resolve(__dirname, '../../test-data/expected-network.json');

  it('reproduces the expected network structure from sample data', () => {
    const posts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));

    const extractor = new InfluenceNetworkExtractor();
    const sources: SourceData[] = [{ kind: 'social', posts }];
    const network = extractor.extract(sources);
    const enriched = extractor.enrich(network);
    const ranked = extractor.rankNodes(enriched);
    const actual = { ...enriched, rankings: ranked.rankings };

    const normalizeGraph = (graph: typeof actual.graph) => ({
      nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)),
      edges: [...graph.edges].sort((a, b) => {
        if (a.from === b.from) {
          if (a.to === b.to) {
            return a.weight - b.weight;
          }
          return a.to.localeCompare(b.to);
        }
        return a.from.localeCompare(b.from);
      }),
      adjacency: graph.adjacency,
    });

    const normalisedActual = {
      ...actual,
      graph: normalizeGraph(actual.graph),
      relationships: [...actual.relationships].sort((a, b) => {
        if (a.type === b.type) {
          if (a.from === b.from) {
            return a.to.localeCompare(b.to);
          }
          return a.from.localeCompare(b.from);
        }
        return a.type.localeCompare(b.type);
      }),
      entities: [...actual.entities].sort((a, b) => a.id.localeCompare(b.id)),
      rankings: [...actual.rankings].sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id)),
      motifs: {
        botNetworks: [...actual.motifs.botNetworks].sort((a, b) => b.activityScore - a.activityScore),
        amplifierClusters: [...actual.motifs.amplifierClusters].sort(
          (a, b) => b.amplificationScore - a.amplificationScore,
        ),
        coordinatedBehaviors: [...actual.motifs.coordinatedBehaviors].sort(
          (a, b) => b.support - a.support,
        ),
      },
    };

    const normalisedExpected = {
      ...expected,
      graph: normalizeGraph(expected.graph),
      relationships: [...expected.relationships].sort((a, b) => {
        if (a.type === b.type) {
          if (a.from === b.from) {
            return a.to.localeCompare(b.to);
          }
          return a.from.localeCompare(b.from);
        }
        return a.type.localeCompare(b.type);
      }),
      entities: [...expected.entities].sort((a, b) => a.id.localeCompare(b.id)),
      rankings: [...expected.rankings].sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id)),
      motifs: {
        botNetworks: [...expected.motifs.botNetworks].sort((a, b) => b.activityScore - a.activityScore),
        amplifierClusters: [...expected.motifs.amplifierClusters].sort(
          (a, b) => b.amplificationScore - a.amplificationScore,
        ),
        coordinatedBehaviors: [...expected.motifs.coordinatedBehaviors].sort((a, b) => b.support - a.support),
      },
    };

    expect(normalisedActual).toEqual(normalisedExpected);
    expect(normalisedActual.motifs.botNetworks.length).toBeGreaterThan(0);
    expect(normalisedActual.relationships.some((rel) => rel.type === 'share')).toBe(true);
    expect(normalisedActual.relationships.some((rel) => rel.type === 'reply')).toBe(true);
    expect(normalisedActual.relationships.some((rel) => rel.type === 'mention')).toBe(true);
  });
});
