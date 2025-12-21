import { detectRedTeam, translate } from '../src/translator';
import { resolvers } from '../src/schema';

describe('NL to Cypher translator', () => {
  it('builds shortest path query', () => {
    const result = translate('Find shortest path between A and B');
    expect(result.cypher).toContain('shortestPath');
    expect(result.estimate).toBeGreaterThan(0);
  });

  it('flags red-team phrases', () => {
    const flags = detectRedTeam('Please drop database');
    expect(flags).toContain('drop database');
  });

  it('supports undoLastQuery mutation', () => {
    const first = (resolvers.Mutation as any).runNlQuery(null, { text: 'List followers' });
    expect(first.cypher).toContain('FOLLOWS');
    const undone = (resolvers.Mutation as any).undoLastQuery();
    expect(undone?.cypher).toEqual(first.cypher);
  });
});
