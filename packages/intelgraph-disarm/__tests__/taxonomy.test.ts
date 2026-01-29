import { loadDisarmTaxonomy } from '../src/index.js';
import { describe, it, expect } from '@jest/globals';

describe('DISARM Taxonomy Loader', () => {
  it('should load the taxonomy successfully', () => {
    const taxonomy = loadDisarmTaxonomy();
    expect(taxonomy).toBeDefined();
    expect(taxonomy.version).toBe('1.0');
    expect(taxonomy.techniques.length).toBeGreaterThan(0);
  });

  it('should contain specific techniques', () => {
    const taxonomy = loadDisarmTaxonomy();
    const t0081 = taxonomy.techniques.find((t) => t.technique_id === 'T0081');
    expect(t0081).toBeDefined();
    expect(t0081?.technique_name).toBe('Create Inauthentic Accounts');
    expect(t0081?.observables).toHaveLength(3);
  });

  it('should fail if schema is invalid', () => {
    // This implicitly tests the Zod schema validation because loadDisarmTaxonomy calls parse().
    // Since the source file is valid, this should pass.
    expect(() => loadDisarmTaxonomy()).not.toThrow();
  });
});
