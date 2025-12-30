import mergePolicyOverlay from '../../server/src/policy/overlays/merge.js';
import { TenantOverlayConfig } from '../../server/src/policy/overlays/types.js';

describe('mergePolicyOverlay', () => {
  const basePolicy = {
    rules: [
      { id: 'allow-read', effect: 'allow', description: 'Allow read access' },
      { id: 'deny-delete', effect: 'deny', description: 'Deny delete operations' },
    ],
  };

  const baseRef = { id: 'global-default', version: '1.0.0' };

  it('applies override patches while preserving base ordering', () => {
    const overlay: TenantOverlayConfig = {
      tenantId: 'acme',
      base: baseRef,
      patches: [
        {
          op: 'override',
          ruleId: 'deny-delete',
          rule: { id: 'deny-delete', effect: 'deny', description: 'Scoped delete denial' },
        },
      ],
    };

    const merged = mergePolicyOverlay(basePolicy, overlay);

    expect(merged.rules).toEqual([
      { id: 'allow-read', effect: 'allow', description: 'Allow read access' },
      { id: 'deny-delete', effect: 'deny', description: 'Scoped delete denial' },
    ]);
  });

  it('supports removing rules from the base policy', () => {
    const overlay: TenantOverlayConfig = {
      tenantId: 'acme',
      base: baseRef,
      patches: [
        {
          op: 'remove',
          ruleId: 'deny-delete',
        },
      ],
    };

    const merged = mergePolicyOverlay(basePolicy, overlay);
    expect(merged.rules).toEqual([{ id: 'allow-read', effect: 'allow', description: 'Allow read access' }]);
  });

  it('is deterministic for identical input', () => {
    const overlay: TenantOverlayConfig = {
      tenantId: 'acme',
      base: baseRef,
      patches: [
        { op: 'append', ruleId: 'allow-export', rule: { id: 'allow-export', effect: 'allow' } },
        { op: 'override', ruleId: 'allow-read', rule: { id: 'allow-read', effect: 'allow', description: 'Updated read' } },
        { op: 'remove', ruleId: 'deny-delete' },
      ],
    };

    const first = mergePolicyOverlay(basePolicy, overlay);
    const second = mergePolicyOverlay(basePolicy, overlay);

    expect(first).toEqual(second);
    expect(first.rules).toEqual([
      { id: 'allow-read', effect: 'allow', description: 'Updated read' },
      { id: 'allow-export', effect: 'allow' },
    ]);
  });
});
