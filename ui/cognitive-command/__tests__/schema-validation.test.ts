import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SCHEMA_DIR = join(__dirname, '..', 'schemas');

const SCHEMA_FILES = [
  'forecast.schema.json',
  'world-state.schema.json',
  'intervention-option.schema.json',
  'cognitive-insight.schema.json',
  'mission-command.schema.json',
  'narrative-battlespace.schema.json',
  'autonomy-supervision.schema.json',
  'governance-decision.schema.json',
];

describe('JSON Schema Validation', () => {
  SCHEMA_FILES.forEach((file) => {
    describe(file, () => {
      it('is valid JSON', () => {
        const content = readFileSync(join(SCHEMA_DIR, file), 'utf8');
        expect(() => JSON.parse(content)).not.toThrow();
      });

      it('has required $schema field', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      });

      it('has $id field', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.$id).toBeDefined();
        expect(schema.$id).toContain('summit://schemas/');
      });

      it('has title field', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.title).toBeDefined();
        expect(typeof schema.title).toBe('string');
      });

      it('has required fields array', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.required).toBeDefined();
        expect(Array.isArray(schema.required)).toBe(true);
        expect(schema.required.length).toBeGreaterThan(0);
      });

      it('has properties object', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.properties).toBeDefined();
        expect(typeof schema.properties).toBe('object');
      });

      it('has id property with string type', () => {
        const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8'));
        expect(schema.properties.id).toBeDefined();
        expect(schema.properties.id.type).toBe('string');
      });
    });
  });
});
