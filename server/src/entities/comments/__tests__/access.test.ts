import { describe, expect, it } from '@jest/globals';
import {
  createEntityCommentAuthorizer,
  EntityCommentAccessError,
} from '../access.js';

describe('entity comment ABAC authorizer', () => {
  it('allows access when OPA approves', async () => {
    const authorizer = createEntityCommentAuthorizer({
      checkDataAccess: async () => true,
    });

    await expect(
      authorizer({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityId: 'entity-1',
        action: 'comment:read',
      }),
    ).resolves.toBeUndefined();
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
