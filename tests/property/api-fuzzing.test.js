"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const v4_1 = require("zod/v4");
const ApiValidationLayer_1 = require("../../server/src/validation/ApiValidationLayer");
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
const addTraversalNoise = (value) => `../${value}/../`;
const searchInputArb = fast_check_1.default.record({
    query: fast_check_1.default
        .string({ minLength: 1, maxLength: 120 })
        .map((q) => addTraversalNoise(q.trim())),
    entityTypes: fast_check_1.default.option(fast_check_1.default.array(fast_check_1.default.constantFrom('PERSON', 'ORGANIZATION', 'LOCATION'), { maxLength: 3 }), { nil: undefined }),
    investigationIds: fast_check_1.default.option(fast_check_1.default.array(fast_check_1.default.uuid(), { minLength: 0, maxLength: 3 }), { nil: undefined }),
    tags: fast_check_1.default.option(fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 20 }).map(addTraversalNoise), { maxLength: 4 }), { nil: undefined }),
    dateRange: fast_check_1.default.option(fast_check_1.default
        .tuple(fast_check_1.default.date({ min: new Date('2000-01-01') }), fast_check_1.default.date({ max: new Date('2030-12-31') }))
        .map(([startDate, endDate]) => startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate }), { nil: undefined }),
    pagination: fast_check_1.default.option(fast_check_1.default.record({
        page: fast_check_1.default.integer({ min: 1, max: 5 }),
        limit: fast_check_1.default.integer({ min: 1, max: 50 }),
        sortBy: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 24 }), { nil: undefined }),
        sortOrder: fast_check_1.default.constantFrom('asc', 'desc'),
    }), { nil: undefined }),
});
describe('GraphQL input fuzzing', () => {
    test('sanitizes traversal patterns without crashing GraphQL input validation', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(searchInputArb, async (input) => {
            let result;
            expect(() => {
                result = ApiValidationLayer_1.graphqlValidator.validate('SearchInput', input);
            }).not.toThrow();
            expect(result).toBeDefined();
            if (result?.success) {
                expect(result.data?.query).not.toContain('../');
                result.data?.tags?.forEach((tag) => {
                    expect(tag).not.toContain('../');
                });
            }
            else {
                expect(result?.errors && result.errors.length).toBeGreaterThan(0);
            }
        }), fuzzRuntimeSettings);
    });
    test('rejects unregistered GraphQL input types to avoid policy bypass', async () => {
        const unknownTypeArb = fast_check_1.default.string({ minLength: 5, maxLength: 40 }).filter((name) => !graphQLTypes.has(name));
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(unknownTypeArb, fast_check_1.default.jsonObject({ maxDepth: 3 }), async (typeName, payload) => {
            const result = ApiValidationLayer_1.graphqlValidator.validate(typeName, payload);
            expect(result.success).toBe(false);
            expect(result.errors?.[0]?.code).toBe('unknown_type');
        }), fuzzRuntimeSettings);
    });
});
describe('REST input fuzzing', () => {
    const restSchema = v4_1.z.object({
        headers: v4_1.z.object({
            authorization: v4_1.z.string().min(10).max(256),
            'x-tenant-id': v4_1.z.string().min(1).max(64),
        }),
        params: v4_1.z.object({
            resourceId: v4_1.z.string().min(3).max(64),
        }),
        body: v4_1.z.object({
            payload: v4_1.z.string().min(1).max(512),
        }),
    });
    const restInputArb = fast_check_1.default.record({
        headers: fast_check_1.default.record({
            authorization: fast_check_1.default.string({ minLength: 10, maxLength: 120 }).map(addTraversalNoise),
            'x-tenant-id': fast_check_1.default.string({ minLength: 5, maxLength: 40 }).map((id) => `${id}\n`),
        }),
        params: fast_check_1.default.record({
            resourceId: fast_check_1.default.string({ minLength: 3, maxLength: 40 }).map(addTraversalNoise),
        }),
        body: fast_check_1.default.record({
            payload: fast_check_1.default.string({ minLength: 1, maxLength: 120 }).map(addTraversalNoise),
        }),
    });
    test('sanitizes headers, params, and bodies while remaining idempotent', () => {
        fast_check_1.default.assert(fast_check_1.default.property(restInputArb, (input) => {
            const result = (0, ApiValidationLayer_1.validate)(restSchema, input, { sanitize: true });
            expect(result.success).toBe(true);
            const sanitized = result.data;
            expect(JSON.stringify(sanitized)).not.toContain('../');
            expect((0, ApiValidationLayer_1.sanitizeObject)(sanitized)).toEqual(sanitized);
            expect(sanitized.headers['x-tenant-id']).toBe(sanitized.headers['x-tenant-id'].trim());
        }), fuzzRuntimeSettings);
    });
});
