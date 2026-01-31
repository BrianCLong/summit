import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SpecValidator } from '../validator.js';
import { MappingEngine } from '../engine.js';
import { MappingSpec } from '../schema.js';

describe('Interop Mapping DSL', () => {
  const validSpec: MappingSpec = {
    owner: 'team-tests',
    version: '1.0.0',
    sourceSystem: 'test-system',
    license: 'MIT',
    mappings: [
      { source: 'ext_id', target: 'id', required: true, transform: 'string' },
      { source: 'ext_name', target: 'name', transform: 'trim' },
      { source: 'ext_nested.age', target: 'attributes.age', transform: 'number' },
    ],
    unknownFields: 'quarantine'
  };

  test('Valid spec passes validation', () => {
    expect(() => SpecValidator.validate(validSpec)).not.toThrow();
  });

  test('Invalid spec fails validation', () => {
    // Manually construct invalid spec instead of spreading to avoid TS issues with the inferred type
    const invalidSpec: any = {
      owner: 'team-tests',
      version: '1.0.0',
      sourceSystem: 'test-system',
      license: 'MIT',
      mappings: [
        { source: 123, target: 'id' } // Invalid source type (number instead of string)
      ],
      unknownFields: 'quarantine'
    };
    expect(() => SpecValidator.validate(invalidSpec)).toThrow();
  });

  test('Mapping engine correctly transforms input', () => {
    const engine = new MappingEngine(validSpec);
    const input = {
      ext_id: 101,
      ext_name: '  John Doe  ',
      ext_nested: {
        age: "30"
      },
      extra_field: 'ignored'
    };

    const result = engine.execute(input);

    expect(result.errors).toHaveLength(0);
    expect(result.output.id).toBe('101');
    expect(result.output.name).toBe('John Doe');
    expect(result.output.attributes.age).toBe(30);

    // Quarantine check
    expect(result.quarantined).toHaveProperty('extra_field');
    expect(result.quarantined.extra_field).toBe('ignored');

    // Metadata check
    expect(result.output._metadata.sourceSystem).toBe('test-system');
  });

  test('Missing required field produces error', () => {
    const engine = new MappingEngine(validSpec);
    const input = {
      ext_name: 'Jane'
    };

    const result = engine.execute(input);
    expect(result.errors).toContain('Missing required field: ext_id');
  });

  test('Transform error produces error', () => {
    const engine = new MappingEngine(validSpec);
    const input = {
      ext_id: '123',
      ext_nested: { age: 'not-a-number' }
    };

    const result = engine.execute(input);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/Transform error/);
  });
});
