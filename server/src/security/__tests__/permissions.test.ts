import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PERMISSIONS, normalizePermission, permissionsForRole, userHasPermission } from '../permissions.js';

describe('permissions map', () => {
  it('treats admin as having wildcard access', () => {
    const canDoAnything = userHasPermission({ role: 'ADMIN' }, PERMISSIONS.MANAGE_USERS);
    expect(canDoAnything).toBe(true);
  });

  it('normalizes legacy graph permissions to write_graph for analysts', () => {
    const normalized = normalizePermission('entity:create');
    expect(normalized).toBe(PERMISSIONS.WRITE_GRAPH);

    const analystCanWrite = userHasPermission({ role: 'ANALYST' }, 'entity:create');
    expect(analystCanWrite).toBe(true);
  });

  it('prevents viewers from performing graph mutations', () => {
    const viewerPermissions = permissionsForRole('VIEWER');
    expect(viewerPermissions).toContain(PERMISSIONS.READ_GRAPH);
    expect(userHasPermission({ role: 'VIEWER' }, PERMISSIONS.WRITE_GRAPH)).toBe(false);
  });

  it('allows operators to manage Maestro runs through the shared permission', () => {
    expect(userHasPermission({ role: 'OPERATOR' }, PERMISSIONS.RUN_MAESTRO)).toBe(true);
    expect(userHasPermission({ role: 'OPERATOR' }, 'run:update')).toBe(true);
  });
});
