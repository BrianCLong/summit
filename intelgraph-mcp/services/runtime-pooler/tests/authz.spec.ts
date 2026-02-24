import { describe, expect, it } from 'vitest';
import { AuthorizationError, authorize } from '../src/authz';

describe('authorize', () => {
  it('rejects missing authorization header with 401', async () => {
    await expect(
      authorize(undefined, {
        action: 'allocate',
        tenant: 'demo',
        toolClass: 'echo',
      }),
    ).rejects.toMatchObject({
      name: AuthorizationError.name,
      statusCode: 401,
      reason: 'missing_authorization',
    });
  });
});
