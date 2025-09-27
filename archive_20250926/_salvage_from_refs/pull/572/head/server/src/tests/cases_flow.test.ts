import { caseResolvers } from '../graphql/resolvers/cases';

describe('cases flow', () => {
  it('creates a case and sets status', () => {
    const c = caseResolvers.Mutation.createCase({}, { title: 't1' });
    expect(c.status).toBe('open');
    const updated = caseResolvers.Mutation.setCaseStatus({}, { caseId: c.id, status: 'closed' });
    expect(updated.status).toBe('closed');
  });
});
