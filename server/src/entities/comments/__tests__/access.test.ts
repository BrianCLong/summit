import { describe, expect, it, jest } from '@jest/globals';
import {
  createEntityCommentAuthorizer,
  EntityCommentAccessError,
  OpaAccessClient,
} from '../access.js';

describe('entity comment ABAC authorizer', () => {
  it('allows access when OPA approves', async () => {
    const checkDataAccess = jest.fn(async () => true) as jest.MockedFunction<
      OpaAccessClient['checkDataAccess']
    >;
    const authorizer = createEntityCommentAuthorizer({
      checkDataAccess,
    });

    await expect(
      authorizer({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityId: 'entity-1',
        action: 'comment:read',
      }),
    ).resolves.toBeUndefined();

    expect(checkDataAccess).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
      'entity_comment',
      'comment:read',
    );
  });

  it('denies access when OPA rejects', async () => {
    const authorizer = createEntityCommentAuthorizer({
      checkDataAccess: async () => false,
    });

    await expect(
      authorizer({
        userId: 'user-2',
        tenantId: 'tenant-2',
        entityId: 'entity-2',
        action: 'comment:write',
      }),
    ).rejects.toBeInstanceOf(EntityCommentAccessError);
  });
});
