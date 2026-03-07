import { describe, it, expect } from 'vitest';
import { isCapabilityAllowed } from '../../../agents/openclaw_plane/security/denyByDefault';

describe('denyByDefault', () => {
  it('should deny by default if not explicitly allowed', () => {
    const allowlist = { 'workspace.read': true };
    expect(isCapabilityAllowed('workspace.read', allowlist)).toBe(true);
    expect(isCapabilityAllowed('workspace.write', allowlist)).toBe(false);
    expect(isCapabilityAllowed('http.fetch', allowlist)).toBe(false);
  });
});
