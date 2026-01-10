import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClassificationRegistry } from '../../src/governance/classification/registry.js';
import { DataClassification, DataSeverity } from '../../src/governance/classification/types.js';

describe('ClassificationRegistry', () => {
  let registry: ClassificationRegistry;

  beforeEach(() => {
    registry = ClassificationRegistry.getInstance();
    registry.clear();
  });

  it('should be a singleton', () => {
    const reg1 = ClassificationRegistry.getInstance();
    const reg2 = ClassificationRegistry.getInstance();
    expect(reg1).toBe(reg2);
  });

  it('should register and retrieve classification', () => {
    registry.register('User.email', DataClassification.PII, DataSeverity.HIGH);

    const rule = registry.get('User.email');
    expect(rule).toBeDefined();
    expect(rule?.classification).toBe(DataClassification.PII);
    expect(rule?.severity).toBe(DataSeverity.HIGH);
  });

  it('should return undefined for unknown path', () => {
    expect(registry.get('Unknown.field')).toBeUndefined();
  });

  it('should overwrite existing registration', () => {
      registry.register('User.email', DataClassification.PII, DataSeverity.HIGH);
      registry.register('User.email', DataClassification.SECRET, DataSeverity.CRITICAL);

      const rule = registry.get('User.email');
      expect(rule?.classification).toBe(DataClassification.SECRET);
      expect(rule?.severity).toBe(DataSeverity.CRITICAL);
  });
});
