"use strict";
/**
 * Integration Test Framework
 *
 * Comprehensive framework for service integration testing in IntelGraph.
 *
 * @module tests/integration/framework
 *
 * @example
 * ```typescript
 * import {
 *   ServiceTestHarness,
 *   createDefaultHarness,
 *   ContractVerifier,
 *   defineContract,
 *   CommonSchemas,
 *   retry,
 *   graphqlRequest,
 *   assert,
 * } from '@tests/integration/framework';
 *
 * describe('API Integration Tests', () => {
 *   const harness = createDefaultHarness();
 *
 *   beforeAll(async () => {
 *     await harness.setup();
 *   });
 *
 *   afterAll(async () => {
 *     await harness.teardown();
 *   });
 *
 *   it('should create an entity via GraphQL', async () => {
 *     const response = await graphqlRequest('http://localhost:4000/graphql', {
 *       query: `
 *         mutation CreateEntity($input: CreateEntityInput!) {
 *           createEntity(input: $input) {
 *             id
 *             name
 *             type
 *           }
 *         }
 *       `,
 *       variables: {
 *         input: {
 *           name: 'Test Entity',
 *           type: 'person',
 *         },
 *       },
 *     });
 *
 *     assert.noGraphQLErrors(response);
 *     assert.hasData(response);
 *   });
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMetrics = exports.TestDataCleaner = exports.GraphQLQueryBuilder = exports.runInParallel = exports.isolateTest = exports.assert = exports.httpRequest = exports.graphqlRequest = exports.timeout = exports.generateTestId = exports.waitFor = exports.sleep = exports.retry = exports.CommonSchemas = exports.defineContract = exports.ContractBuilder = exports.ContractVerifier = exports.createDefaultHarness = exports.ScopedTestRunner = exports.ServiceTestHarness = void 0;
// Service Test Harness
var ServiceTestHarness_1 = require("./ServiceTestHarness");
Object.defineProperty(exports, "ServiceTestHarness", { enumerable: true, get: function () { return ServiceTestHarness_1.ServiceTestHarness; } });
Object.defineProperty(exports, "ScopedTestRunner", { enumerable: true, get: function () { return ServiceTestHarness_1.ScopedTestRunner; } });
Object.defineProperty(exports, "createDefaultHarness", { enumerable: true, get: function () { return ServiceTestHarness_1.createDefaultHarness; } });
// Contract Testing
var ContractTesting_1 = require("./ContractTesting");
Object.defineProperty(exports, "ContractVerifier", { enumerable: true, get: function () { return ContractTesting_1.ContractVerifier; } });
Object.defineProperty(exports, "ContractBuilder", { enumerable: true, get: function () { return ContractTesting_1.ContractBuilder; } });
Object.defineProperty(exports, "defineContract", { enumerable: true, get: function () { return ContractTesting_1.defineContract; } });
Object.defineProperty(exports, "CommonSchemas", { enumerable: true, get: function () { return ContractTesting_1.CommonSchemas; } });
// Test Helpers
var TestHelpers_1 = require("./TestHelpers");
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return TestHelpers_1.retry; } });
Object.defineProperty(exports, "sleep", { enumerable: true, get: function () { return TestHelpers_1.sleep; } });
Object.defineProperty(exports, "waitFor", { enumerable: true, get: function () { return TestHelpers_1.waitFor; } });
Object.defineProperty(exports, "generateTestId", { enumerable: true, get: function () { return TestHelpers_1.generateTestId; } });
Object.defineProperty(exports, "timeout", { enumerable: true, get: function () { return TestHelpers_1.timeout; } });
Object.defineProperty(exports, "graphqlRequest", { enumerable: true, get: function () { return TestHelpers_1.graphqlRequest; } });
Object.defineProperty(exports, "httpRequest", { enumerable: true, get: function () { return TestHelpers_1.httpRequest; } });
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return TestHelpers_1.assert; } });
Object.defineProperty(exports, "isolateTest", { enumerable: true, get: function () { return TestHelpers_1.isolateTest; } });
Object.defineProperty(exports, "runInParallel", { enumerable: true, get: function () { return TestHelpers_1.runInParallel; } });
Object.defineProperty(exports, "GraphQLQueryBuilder", { enumerable: true, get: function () { return TestHelpers_1.GraphQLQueryBuilder; } });
Object.defineProperty(exports, "TestDataCleaner", { enumerable: true, get: function () { return TestHelpers_1.TestDataCleaner; } });
Object.defineProperty(exports, "TestMetrics", { enumerable: true, get: function () { return TestHelpers_1.TestMetrics; } });
