import { resolvers } from '../src/schema';
import { translateQuery } from '../src/translator';

describe('NL to Cypher translation', () => {
  it('returns shortest path query when requested', () => {
    const result = translateQuery('Find shortest path between A and B');
    expect(result.cypher).toContain('shortestPath');
    expect(result.estimate).toBeGreaterThan(0);
  });

  it('flags red-team prompts', () => {
    const result = translateQuery('drop all passwords');
    expect(result.redFlagged).toBe(true);
  });
});

describe('session undo', () => {
  it('supports undo history', () => {
    const sessionId = 's1';
    const first = resolvers.Mutation.runNlQuery(null, { text: 'query A', sessionId });
    const second = resolvers.Mutation.runNlQuery(null, { text: 'shortest path', sessionId });
    expect(second.cypher).not.toEqual(first.cypher);
    const undone = resolvers.Query.undo(null, { sessionId });
    expect(undone?.cypher).toEqual(first.cypher);
  });
});
