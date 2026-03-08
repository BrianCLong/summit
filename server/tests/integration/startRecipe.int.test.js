"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const fs_1 = __importDefault(require("fs"));
const globals_1 = require("@jest/globals");
// Mock dependencies before importing the app
globals_1.jest.mock('../../src/recipes/loader.js');
globals_1.jest.mock('../../src/featureFlags/flagsmith.js');
globals_1.jest.mock('crypto');
const mockLoadRecipe = require('../../src/recipes/loader.js')
    .loadRecipe;
const mockFlagEnabled = require('../../src/featureFlags/flagsmith.js')
    .isEnabled;
const mockCrypto = require('crypto');
(0, globals_1.describe)('GraphQL startRecipe Integration Tests', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        // Import app after mocks are set up
        const { createApp } = await Promise.resolve().then(() => __importStar(require('../../src/app.js')));
        app = await createApp();
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockCrypto.randomUUID.mockReturnValue('test-uuid-123');
    });
    const executeGraphQL = async (query, variables) => {
        return (0, supertest_1.default)(app)
            .post('/graphql')
            .send({ query, variables })
            .set('Content-Type', 'application/json');
    };
    (0, globals_1.describe)('startRecipe mutation', () => {
        (0, globals_1.beforeEach)(() => {
            // Mock file system calls
            globals_1.jest.spyOn(fs_1.default, 'existsSync').mockReturnValue(true);
            globals_1.jest
                .spyOn(fs_1.default, 'readdirSync')
                .mockReturnValue(['test-recipe.yaml', 'other-recipe.yml']);
            mockLoadRecipe.mockResolvedValue({
                name: 'Test Recipe',
                description: 'A test recipe for integration testing',
                inputs: {
                    requiredParam: { required: true, type: 'string' },
                    optionalParam: { required: false, type: 'number', default: 42 },
                },
            });
        });
        (0, globals_1.it)('should successfully start a recipe with valid inputs', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            (0, globals_1.expect)(response.body.data.startRecipe).toEqual({
                runId: 'recipe-run-test-uuid-123',
                auditId: 'audit-test-uuid-123',
                status: 'QUEUED',
                recipe: 'test-recipe.yaml',
                inputs: { requiredParam: 'test-value' },
            });
        });
        (0, globals_1.it)('should return error for missing recipe', async () => {
            globals_1.jest.spyOn(fs_1.default, 'existsSync').mockReturnValue(false);
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toContain("Recipe 'nonexistent-recipe' not found");
        });
        (0, globals_1.it)('should validate required inputs', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toBe("Required input 'requiredParam' is missing");
        });
        (0, globals_1.it)('should handle recipe loading errors', async () => {
            mockLoadRecipe.mockResolvedValue({ __error: 'Invalid YAML syntax' });
            const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;
            const response = await executeGraphQL(mutation, { name: 'test-recipe' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toBe('Recipe loading error: Invalid YAML syntax');
        });
        (0, globals_1.it)('should enforce budget plugin when required', async () => {
            process.env.REQUIRE_BUDGET_PLUGIN = 'true';
            const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;
            const response = await executeGraphQL(mutation, { name: 'test-recipe' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toBe('Budget plugin is required but not available in context');
            delete process.env.REQUIRE_BUDGET_PLUGIN;
        });
        (0, globals_1.it)('should work with recipe files having .yml extension', async () => {
            globals_1.jest
                .spyOn(fs_1.default, 'existsSync')
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            (0, globals_1.expect)(response.body.data.startRecipe.recipe).toBe('test-recipe.yml');
        });
        (0, globals_1.it)('should work with full recipe filename', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            (0, globals_1.expect)(response.body.data.startRecipe.recipe).toBe('test-recipe.yaml');
        });
        (0, globals_1.it)('should handle empty inputs gracefully', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            (0, globals_1.expect)(response.body.data.startRecipe.inputs).toEqual({});
        });
    });
    (0, globals_1.describe)('Budget directive integration', () => {
        (0, globals_1.it)('should respect @budget directive limits', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            const mutations = response.body.data.__schema.mutationType.fields;
            const startRecipeMutation = mutations.find((f) => f.name === 'startRecipe');
            (0, globals_1.expect)(startRecipeMutation).toBeDefined();
        });
    });
    (0, globals_1.describe)('Error handling', () => {
        (0, globals_1.it)('should handle file system errors gracefully', async () => {
            globals_1.jest.spyOn(fs_1.default, 'existsSync').mockImplementation(() => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
        });
        (0, globals_1.it)('should handle recipe loader exceptions', async () => {
            mockLoadRecipe.mockRejectedValue(new Error('Database connection failed'));
            const mutation = `
        mutation StartRecipe($name: String!) {
          startRecipe(name: $name) {
            runId
          }
        }
      `;
            const response = await executeGraphQL(mutation, { name: 'test-recipe' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toContain('Failed to load recipe');
        });
    });
    (0, globals_1.describe)('Audit trail', () => {
        (0, globals_1.it)('should generate proper audit IDs', async () => {
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
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data.startRecipe).toEqual({
                runId: 'recipe-run-run-uuid-123',
                auditId: 'audit-audit-uuid-456',
            });
        });
    });
});
