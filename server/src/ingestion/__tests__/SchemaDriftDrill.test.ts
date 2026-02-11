
import { describe, it, expect } from '@jest/globals';
import { semanticMapperService } from '../semantic-mapper.js';

describe('Schema Drift Drill (Task #108)', () => {
  it('should autonomously map a "User" payload to "Person" entity', async () => {
    const rawData = {
      full_name: 'John Doe',
      contact_email: 'john@example.com',
      job_role: 'Engineer'
    };

    const mapping = await semanticMapperService.suggestMapping(rawData);

    expect(mapping.targetType).toBe('Person');
    expect(mapping.overallConfidence).toBeGreaterThan(0.5);

    // Check specific field mappings
    const nameMap = mapping.mappings.find(m => m.sourceField === 'full_name');
    expect(nameMap?.targetField).toBe('name');

    const emailMap = mapping.mappings.find(m => m.sourceField === 'contact_email');
    expect(emailMap?.targetField).toBe('email');
  });

  it('should autonomously map a "Company" payload to "Organization" entity', async () => {
    const rawData = {
      company_name: 'Acme Corp',
      web_address: 'acme.com',
      founded_in: '1999'
    };

    const mapping = await semanticMapperService.suggestMapping(rawData);

    expect(mapping.targetType).toBe('Organization');

    const transformed = semanticMapperService.applyMapping(rawData, mapping);
    expect(transformed.type).toBe('Organization');
    expect(transformed.name).toBe('Acme Corp');
    expect(transformed.website).toBe('acme.com');
  });

  it('should degrade gracefully for unknown schemas', async () => {
    const rawData = {
      x: 1,
      y: 2,
      z: 3
    };

    const mapping = await semanticMapperService.suggestMapping(rawData);
    expect(mapping.targetType).toBe('Unstructured');
  });
});
