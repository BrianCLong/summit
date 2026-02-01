import { checkPermission, ALLOWED_PERMISSIONS } from '../../src/policy/permissions';

describe('Policy: Deny by Default', () => {
  it('should deny access if agent is not in allowlist', () => {
    const result = checkPermission({
      agentId: 'unknown-agent',
      tool: 'calculator',
      action: 'add'
    });
    expect(result).toBe(false);
  });

  it('should deny access if permission is not granted', () => {
    const result = checkPermission({
      agentId: 'agent-a',
      tool: 'calculator',
      action: 'subtract' // Not allowed
    });
    expect(result).toBe(false);
  });

  it('should allow access if explicitly granted', () => {
    const result = checkPermission({
      agentId: 'agent-a',
      tool: 'calculator',
      action: 'add'
    });
    expect(result).toBe(true);
  });

  it('should deny access for spoofed agent ID (basic check)', () => {
      const result = checkPermission({
          agentId: 'agent-b',
          tool: 'calculator',
          action: 'add' // agent-b doesn't have this
      });
      expect(result).toBe(false);
  });
});
