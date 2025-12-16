const test = require('node:test');
const assert = require('node:assert');
const { AccessControl, PERMISSIONS, BUILT_IN_ROLES } = require('../src/accessControl');

test('AccessControl has built-in roles', () => {
  const ac = new AccessControl();
  const roles = ac.listRoles();

  assert.ok(roles.length > 0);
  assert.ok(roles.find((r) => r.name === 'data-steward'));
  assert.ok(roles.find((r) => r.name === 'data-analyst'));
  assert.ok(roles.find((r) => r.name === 'governance-admin'));
});

test('AccessControl registers and manages principals', () => {
  const ac = new AccessControl();

  const principal = ac.registerPrincipal({
    id: 'user-123',
    type: 'user',
    roles: ['data-analyst'],
    attributes: { department: 'engineering' },
    clearanceLevel: 1,
  });

  assert.strictEqual(principal.id, 'user-123');
  assert.ok(principal.roles.includes('data-analyst'));

  const retrieved = ac.getPrincipal('user-123');
  assert.deepStrictEqual(retrieved, principal);
});

test('AccessControl assigns and revokes roles', () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'user-456',
    type: 'user',
    roles: ['viewer'],
  });

  ac.assignRole('user-456', 'data-analyst');
  let principal = ac.getPrincipal('user-456');
  assert.ok(principal.roles.includes('data-analyst'));
  assert.ok(principal.roles.includes('viewer'));

  ac.revokeRole('user-456', 'viewer');
  principal = ac.getPrincipal('user-456');
  assert.ok(!principal.roles.includes('viewer'));
  assert.ok(principal.roles.includes('data-analyst'));
});

test('AccessControl computes effective permissions', () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'user-789',
    type: 'user',
    roles: ['data-analyst'],
  });

  const permissions = ac.getEffectivePermissions('user-789');
  assert.ok(permissions.includes(PERMISSIONS.CONTRACT_READ));
  assert.ok(permissions.includes(PERMISSIONS.SCHEMA_READ));
  assert.ok(!permissions.includes(PERMISSIONS.CONTRACT_DELETE));
});

test('AccessControl checks permissions correctly', () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'analyst-1',
    type: 'user',
    roles: ['data-analyst'],
  });

  ac.registerPrincipal({
    id: 'steward-1',
    type: 'user',
    roles: ['data-steward'],
  });

  assert.strictEqual(ac.hasPermission('analyst-1', PERMISSIONS.CONTRACT_READ), true);
  assert.strictEqual(ac.hasPermission('analyst-1', PERMISSIONS.CONTRACT_DELETE), false);
  assert.strictEqual(ac.hasPermission('steward-1', PERMISSIONS.CONTRACT_DELETE), true);
});

test('AccessControl authorizes requests', async () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'user-auth-1',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 2,
  });

  const allowedResult = await ac.authorize({
    principal: 'user-auth-1',
    resource: { type: 'contract', id: 'test-contract', classification: ['Internal'] },
    action: 'read',
  });

  assert.strictEqual(allowedResult.decision, 'allow');

  const deniedResult = await ac.authorize({
    principal: 'user-auth-1',
    resource: { type: 'contract', id: 'test-contract' },
    action: 'delete',
  });

  assert.strictEqual(deniedResult.decision, 'deny');
  assert.ok(deniedResult.reason.includes('Missing permission'));
});

test('AccessControl enforces classification clearance', async () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'low-clearance',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 1,
  });

  ac.registerPrincipal({
    id: 'high-clearance',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 3,
  });

  const lowResult = await ac.authorize({
    principal: 'low-clearance',
    resource: { type: 'contract', id: 'secret-contract', classification: ['Secret'] },
    action: 'read',
  });

  assert.strictEqual(lowResult.decision, 'deny');
  assert.ok(lowResult.reason.includes('clearance'));

  const highResult = await ac.authorize({
    principal: 'high-clearance',
    resource: { type: 'contract', id: 'secret-contract', classification: ['Secret'] },
    action: 'read',
  });

  assert.strictEqual(highResult.decision, 'allow');
});

test('AccessControl enforces region restrictions', async () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'us-user',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 2,
    allowedRegions: ['us-east-1', 'us-west-2'],
  });

  const allowedRegion = await ac.authorize({
    principal: 'us-user',
    resource: { type: 'contract', id: 'test' },
    action: 'read',
    context: { region: 'us-east-1' },
  });

  assert.strictEqual(allowedRegion.decision, 'allow');

  const deniedRegion = await ac.authorize({
    principal: 'us-user',
    resource: { type: 'contract', id: 'test' },
    action: 'read',
    context: { region: 'eu-west-1' },
  });

  assert.strictEqual(deniedRegion.decision, 'deny');
  assert.ok(deniedRegion.reason.includes('Region'));
});

test('AccessControl registers custom roles', () => {
  const ac = new AccessControl();

  ac.registerRole('custom-role', {
    description: 'Custom test role',
    permissions: [PERMISSIONS.CONTRACT_READ, PERMISSIONS.AUDIT_READ],
  });

  const role = ac.getRole('custom-role');
  assert.ok(role);
  assert.strictEqual(role.description, 'Custom test role');
  assert.ok(role.permissions.includes(PERMISSIONS.CONTRACT_READ));
});

test('AccessControl manages custom policies', async () => {
  const ac = new AccessControl();

  ac.registerPrincipal({
    id: 'policy-test-user',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 2,
    attributes: { department: 'engineering' },
  });

  ac.addPolicy({
    id: 'require-engineering',
    type: 'attribute-based',
    requiredAttributes: { department: 'engineering' },
  });

  const result = await ac.authorize({
    principal: 'policy-test-user',
    resource: { type: 'contract', id: 'test' },
    action: 'read',
  });

  assert.strictEqual(result.decision, 'allow');

  // Test with user missing required attribute
  ac.registerPrincipal({
    id: 'marketing-user',
    type: 'user',
    roles: ['data-analyst'],
    clearanceLevel: 2,
    attributes: { department: 'marketing' },
  });

  const denied = await ac.authorize({
    principal: 'marketing-user',
    resource: { type: 'contract', id: 'test' },
    action: 'read',
  });

  assert.strictEqual(denied.decision, 'deny');
});

test('AccessControl caches permission checks', () => {
  const ac = new AccessControl({ cacheEnabled: true, cacheTTL: 60000 });

  ac.registerPrincipal({
    id: 'cache-test',
    type: 'user',
    roles: ['data-analyst'],
  });

  // First check - populates cache
  const result1 = ac.hasPermission('cache-test', PERMISSIONS.CONTRACT_READ);
  assert.strictEqual(result1, true);

  // Second check - uses cache
  const result2 = ac.hasPermission('cache-test', PERMISSIONS.CONTRACT_READ);
  assert.strictEqual(result2, true);

  // Invalidate cache
  ac.invalidateCache('cache-test');

  // Check again - should still work after cache invalidation
  const result3 = ac.hasPermission('cache-test', PERMISSIONS.CONTRACT_READ);
  assert.strictEqual(result3, true);
});
