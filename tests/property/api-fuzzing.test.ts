import fc from 'fast-check';
import { z } from 'zod/v4';
import {
  GraphQLInputValidator,
  graphqlValidator,
  sanitizeObject,
  validate,
} from '../../server/src/validation/ApiValidationLayer';

const fuzzRuntimeSettings = {
  seed: 20251220,
  numRuns: 50,
  interruptAfterTimeLimit: 2000,
  verbose: true,
};

const graphQLTypes = new Set([
  'CreateEntity',
  'UpdateEntity',
  'CreateRelationship',
  'CreateInvestigation',
  'SearchInput',
  'AIAnalysis',
]);

const addTraversalNoise = (value: string): string => `../${value}/../`;

const searchInputArb = fc.record({
  query: fc
    .string({ minLength: 1, maxLength: 120 })
    .map((q) => addTraversalNoise(q.trim())),
  entityTypes: fc.option(
    fc.array(fc.constantFrom('PERSON', 'ORGANIZATION', 'LOCATION'), { maxLength: 3 }),
    { nil: undefined },
  ),
  investigationIds: fc.option(fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }), { nil: undefined }),
  tags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 20 }).map(addTraversalNoise), { maxLength: 4 }),
    { nil: undefined },
  ),
  dateRange: fc.option(
    fc
      .tuple(fc.date({ min: new Date('2000-01-01') }), fc.date({ max: new Date('2030-12-31') }))
      .map(([startDate, endDate]) =>
        startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate },
      ),
    { nil: undefined },
  ),
  pagination: fc.option(
    fc.record({
      page: fc.integer({ min: 1, max: 5 }),
      limit: fc.integer({ min: 1, max: 50 }),
      sortBy: fc.option(fc.string({ minLength: 1, maxLength: 24 }), { nil: undefined }),
      sortOrder: fc.constantFrom('asc', 'desc'),
    }),
    { nil: undefined },
  ),
});

describe('GraphQL input fuzzing', () => {
  test('sanitizes traversal patterns without crashing GraphQL input validation', async () => {
    await fc.assert(
      fc.asyncProperty(searchInputArb, async (input) => {
        let result: ReturnType<GraphQLInputValidator['validate']> | undefined;

        expect(() => {
          result = graphqlValidator.validate('SearchInput', input);
        }).not.toThrow();

        expect(result).toBeDefined();
        if (result?.success) {
          expect(result.data?.query).not.toContain('../');
          result.data?.tags?.forEach((tag: string) => {
            expect(tag).not.toContain('../');
          });
        } else {
          expect(result?.errors && result.errors.length).toBeGreaterThan(0);
        }
      }),
      fuzzRuntimeSettings,
    );
  });

  test('rejects unregistered GraphQL input types to avoid policy bypass', async () => {
    const unknownTypeArb = fc.string({ minLength: 5, maxLength: 40 }).filter((name) => !graphQLTypes.has(name));

    await fc.assert(
      fc.asyncProperty(unknownTypeArb, fc.jsonObject({ maxDepth: 3 }), async (typeName, payload) => {
        const result = graphqlValidator.validate(typeName, payload);

        expect(result.success).toBe(false);
        expect(result.errors?.[0]?.code).toBe('unknown_type');
      }),
      fuzzRuntimeSettings,
    );
  });
});

describe('REST input fuzzing', () => {
  const restSchema = z.object({
    headers: z.object({
      authorization: z.string().min(10).max(256),
      'x-tenant-id': z.string().min(1).max(64),
    }),
    params: z.object({
      resourceId: z.string().min(3).max(64),
    }),
    body: z.object({
      payload: z.string().min(1).max(512),
    }),
  });

  const restInputArb = fc.record({
    headers: fc.record({
      authorization: fc.string({ minLength: 10, maxLength: 120 }).map(addTraversalNoise),
      'x-tenant-id': fc.string({ minLength: 5, maxLength: 40 }).map((id) => `${id}\n`),
    }),
    params: fc.record({
      resourceId: fc.string({ minLength: 3, maxLength: 40 }).map(addTraversalNoise),
    }),
    body: fc.record({
      payload: fc.string({ minLength: 1, maxLength: 120 }).map(addTraversalNoise),
    }),
  });

  test('sanitizes headers, params, and bodies while remaining idempotent', () => {
    fc.assert(
      fc.property(restInputArb, (input) => {
        const result = validate(restSchema, input, { sanitize: true });

        expect(result.success).toBe(true);

        const sanitized = result.data!;
        expect(JSON.stringify(sanitized)).not.toContain('../');
        expect(sanitizeObject(sanitized)).toEqual(sanitized);
        expect(sanitized.headers['x-tenant-id']).toBe(sanitized.headers['x-tenant-id'].trim());
      }),
      fuzzRuntimeSettings,
    );
  });
});
