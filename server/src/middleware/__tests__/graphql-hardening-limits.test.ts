import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { buildSchema, parse, validate } from 'graphql';
import { createGraphQLHardening } from '../graphql-hardening.js';

describe('createGraphQLHardening validation rules', () => {
  const schema = buildSchema(`
    type Child { value: String, child: Child }
    type Query { root: Child }
  `);

  it('rejects queries that exceed configured depth', () => {
    const hardening = createGraphQLHardening({ maxDepth: 2, maxComplexity: 100, maxCost: 100 });
    const document = parse('{ root { child { child { value } } } }');

    const errors = validate(schema, document, hardening.validationRules);

    expect(errors.some((error) => /depth/i.test(error.message))).toBe(true);
  });

  it('rejects queries that exceed configured complexity', () => {
    const hardening = createGraphQLHardening({ maxDepth: 10, maxComplexity: 2, maxCost: 100 });
    const document = parse('{ root { child { value child { value } } } }');

    const errors = validate(schema, document, hardening.validationRules);

    expect(errors.some((error) => error.message.includes('exceeds maximum allowed complexity'))).toBe(true);
  });
});
