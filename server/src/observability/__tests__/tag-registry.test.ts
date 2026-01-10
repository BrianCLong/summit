import { TAG_REGISTRY, validateTags } from '../run-spans/tag-registry.js';
import { TagDefinition } from '../run-spans/types.js';

describe('validateTags', () => {
  const originalStrict = process.env.OBS_TAG_REGISTRY_STRICT;
  const originalPiiAllow = process.env.OBS_TAG_PII_ALLOWED;
  const piiTag: TagDefinition = {
    key: 'userEmail',
    type: 'string',
    scope: 'run',
    description: 'Test-only PII tag',
    pii: true,
  };

  beforeEach(() => {
    process.env.OBS_TAG_REGISTRY_STRICT = 'false';
    process.env.OBS_TAG_PII_ALLOWED = 'false';
    TAG_REGISTRY.push(piiTag);
  });

  afterEach(() => {
    process.env.OBS_TAG_REGISTRY_STRICT = originalStrict;
    process.env.OBS_TAG_PII_ALLOWED = originalPiiAllow;
    const index = TAG_REGISTRY.findIndex((def) => def.key === piiTag.key);
    if (index >= 0) {
      TAG_REGISTRY.splice(index, 1);
    }
  });

  it('rejects unknown tags in strict mode', () => {
    process.env.OBS_TAG_REGISTRY_STRICT = 'true';
    expect(() => validateTags({ unknownKey: 'value' })).toThrow(
      'Rejecting unknown or disallowed tags: unknownKey',
    );
  });

  it('blocks PII tags unless explicitly allowed', () => {
    const blocked = validateTags({ userEmail: 'person@example.com' });
    expect(blocked.invalidKeys).toContain('userEmail');

    process.env.OBS_TAG_PII_ALLOWED = 'true';
    const allowed = validateTags({ userEmail: 'person@example.com' });
    expect(allowed.invalidKeys).toHaveLength(0);
    expect(allowed.valid.userEmail).toBe('person@example.com');
  });
});
