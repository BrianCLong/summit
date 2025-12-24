import { resolvers } from '../../src/resolvers';

describe('case resolvers', () => {
  it('case_open returns id', () => {
    const r = resolvers.Mutation.case_open({}, { title: 'T', sla: 'P2D' });
    expect(r.id).toMatch(/^c_/);
  });
});
