import { describe, it, expect } from 'vitest';
import { ResourceSchema, CapabilitiesSchema } from '../schemas.js';

describe('Schemas', () => {
  it('should validate a valid resource', () => {
    const validResource = {
      name: 'Test Resource',
      type: 'Tool',
      url: 'https://example.com',
      capabilities: {
        tool_use: true
      }
    };

    const result = ResourceSchema.parse(validResource);
    expect(result.name).toBe('Test Resource');
    expect(result.capabilities.tool_use).toBe(true);
    expect(result.capabilities.memory).toBe(false); // Default
    expect(result.id).toBeUndefined();
  });

  it('should validate capabilities defaults', () => {
      const caps = CapabilitiesSchema.parse({});
      expect(caps.tool_use).toBe(false);
  });
});
