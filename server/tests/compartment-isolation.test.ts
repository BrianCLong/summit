import { ForbiddenError } from 'apollo-server-express';
import { withAuthAndPolicy } from '../src/middleware/withAuthAndPolicy';

describe('compartment-aware investigation isolation', () => {
  const baseUser = {
    id: 'u1',
    email: 'user@example.com',
    roles: ['analyst'],
    permissions: [],
    orgId: 'org-1',
    teamId: 'team-1',
  };

  it('allows access within same org and team', async () => {
    const resolver = withAuthAndPolicy('read', () => ({
      type: 'investigation',
      id: 'inv-1',
      orgId: 'org-1',
      teamId: 'team-1',
    }))(async () => 'ok');

    const result = await resolver(
      {},
      {},
      { user: baseUser },
      { fieldName: 'test', path: 'testPath' },
    );
    expect(result).toBe('ok');
  });

  it('denies access when org differs', async () => {
    const resolver = withAuthAndPolicy('read', () => ({
      type: 'investigation',
      id: 'inv-1',
      orgId: 'org-2',
    }))(async () => 'ok');

    await expect(
      resolver(
        {},
        {},
        { user: baseUser },
        { fieldName: 'test', path: 'testPath' },
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('denies access when team differs', async () => {
    const resolver = withAuthAndPolicy('read', () => ({
      type: 'investigation',
      id: 'inv-1',
      orgId: 'org-1',
      teamId: 'team-2',
    }))(async () => 'ok');

    await expect(
      resolver(
        {},
        {},
        { user: baseUser },
        { fieldName: 'test', path: 'testPath' },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
