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

// Service Test Harness
export {
  ServiceTestHarness,
  ScopedTestRunner,
  createDefaultHarness,
  type ServiceConfig,
  type ServiceHealthStatus,
  type HealthCheckResult,
  type ServiceMockConfig,
  type IntegrationTestContext,
} from './ServiceTestHarness';

// Contract Testing
export {
  ContractVerifier,
  ContractBuilder,
  defineContract,
  CommonSchemas,
  type Contract,
  type ContractInteraction,
  type ContractRequest,
  type ContractResponse,
  type ContractVerificationResult,
  type InteractionResult,
  type SchemaValidationResult,
} from './ContractTesting';

// Test Helpers
export {
  retry,
  sleep,
  waitFor,
  generateTestId,
  timeout,
  graphqlRequest,
  httpRequest,
  assert,
  isolateTest,
  runInParallel,
  GraphQLQueryBuilder,
  TestDataCleaner,
  TestMetrics,
  type RetryConfig,
  type GraphQLRequestOptions,
  type GraphQLResponse,
} from './TestHelpers';
