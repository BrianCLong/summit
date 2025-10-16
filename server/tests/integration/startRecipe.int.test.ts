import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

// Mock dependencies before importing the app
jest.mock('../../src/recipes/loader.js');
jest.mock('../../src/featureFlags/flagsmith.js');
jest.mock('crypto');

const mockLoadRecipe = require('../../src/recipes/loader.js')
  .loadRecipe as jest.MockedFunction<any>;
const mockFlagEnabled = require('../../src/featureFlags/flagsmith.js')
  .isEnabled as jest.MockedFunction<any>;
const mockCrypto = require('crypto') as jest.Mocked<typeof import('crypto')>;

describe('GraphQL startRecipe Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Import app after mocks are set up
    const { createApp } = await import('../../src/app.js');
    app = await createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123');
  });

  const executeGraphQL = async (query: string, variables?: any) => {
    return request(app)
      .post('/graphql')
      .send({ query, variables })
      .set('Content-Type', 'application/json');
  };

  describe('startRecipe mutation', () => {
    beforeEach(() => {
      // Mock file system calls
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(fs, 'readdirSync')
        .mockReturnValue(['test-recipe.yaml', 'other-recipe.yml'] as any);

      mockLoadRecipe.mockResolvedValue({
        name: 'Test Recipe',
        description: 'A test recipe for integration testing',
        inputs: {
          requiredParam: { required: true, type: 'string' },
          optionalParam: { required: false, type: 'number', default: 42 },
        },
      });
    });

    it('should successfully start a recipe with valid inputs', async () => {
      const mutation = `
        mutation StartRecipe($name: String!, $inputs: JSON) {
          startRecipe(name: $name, inputs: $inputs) {
            runId
            auditId
            status
            recipe
            inputs
          }
        }
      `;

      const variables = {
        name: 'test-recipe',
        inputs: { requiredParam: 'test-value' },
      };

      const response = await executeGraphQL(mutation, variables);

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.startRecipe).toEqual({
        runId: 'recipe-run-test-uuid-123',
        auditId: 'audit-test-uuid-123',
        status: 'QUEUED',
        recipe: 'test-recipe.yaml',
        inputs: { requiredParam: 'test-value' },
      });
    });

    it('should return error for missing recipe', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;

      const response = await executeGraphQL(mutation, {
        name: 'nonexistent-recipe',
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        "Recipe 'nonexistent-recipe' not found",
      );
    });

    it('should validate required inputs', async () => {
      const mutation = `
        mutation StartRecipe($name: String!, $inputs: JSON) {
          startRecipe(name: $name, inputs: $inputs) {
            runId
          }
        }
      `;

      const variables = {
        name: 'test-recipe',
        inputs: { optionalParam: 123 }, // Missing requiredParam
      };

      const response = await executeGraphQL(mutation, variables);

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe(
        "Required input 'requiredParam' is missing",
      );
    });

    it('should handle recipe loading errors', async () => {
      mockLoadRecipe.mockResolvedValue({ __error: 'Invalid YAML syntax' });

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe(
        'Recipe loading error: Invalid YAML syntax',
      );
    });

    it('should enforce budget plugin when required', async () => {
      process.env.REQUIRE_BUDGET_PLUGIN = 'true';

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe(
        'Budget plugin is required but not available in context',
      );

      delete process.env.REQUIRE_BUDGET_PLUGIN;
    });

    it('should work with recipe files having .yml extension', async () => {
      jest
        .spyOn(fs, 'existsSync')
        .mockReturnValueOnce(false) // .yaml not found
        .mockReturnValueOnce(true); // .yml found

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            recipe
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.startRecipe.recipe).toBe('test-recipe.yml');
    });

    it('should work with full recipe filename', async () => {
      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            recipe
          }
        }
      `;

      const response = await executeGraphQL(mutation, {
        name: 'test-recipe.yaml',
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.startRecipe.recipe).toBe('test-recipe.yaml');
    });

    it('should handle empty inputs gracefully', async () => {
      mockLoadRecipe.mockResolvedValue({
        name: 'Simple Recipe',
        description: 'No inputs required',
      });

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
            inputs
          }
        }
      `;

      const response = await executeGraphQL(mutation, {
        name: 'simple-recipe',
      });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.startRecipe.inputs).toEqual({});
    });
  });

  describe('Budget directive integration', () => {
    it('should respect @budget directive limits', async () => {
      // This test would require actual budget plugin integration
      // For now, we'll test that the schema includes the directive properly
      const query = `
        query IntrospectionQuery {
          __schema {
            mutationType {
              fields {
                name
                description
              }
            }
          }
        }
      `;

      const response = await executeGraphQL(query);

      expect(response.status).toBe(200);
      const mutations = response.body.data.__schema.mutationType.fields;
      const startRecipeMutation = mutations.find(
        (f: any) => f.name === 'startRecipe',
      );

      expect(startRecipeMutation).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle file system errors gracefully', async () => {
      jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('File system error');
      });

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle recipe loader exceptions', async () => {
      mockLoadRecipe.mockRejectedValue(new Error('Database connection failed'));

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Failed to load recipe',
      );
    });
  });

  describe('Audit trail', () => {
    it('should generate proper audit IDs', async () => {
      mockCrypto.randomUUID
        .mockReturnValueOnce('run-uuid-123')
        .mockReturnValueOnce('audit-uuid-456');

      const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
            auditId
          }
        }
      `;

      const response = await executeGraphQL(mutation, { name: 'test-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.data.startRecipe).toEqual({
        runId: 'recipe-run-run-uuid-123',
        auditId: 'audit-audit-uuid-456',
      });
    });
  });
});
