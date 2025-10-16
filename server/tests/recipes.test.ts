import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import recipesRouter from '../src/routes/recipes.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/recipes/loader.js');
jest.mock('../src/featureFlags/flagsmith.js');
jest.mock('fs');
jest.mock('crypto');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockCrypto = require('crypto') as jest.Mocked<typeof import('crypto')>;

describe('Recipes REST API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(recipesRouter);
    jest.clearAllMocks();
  });

  describe('GET /recipes', () => {
    it('should return list of recipe files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'recipe1.yaml',
        'recipe2.yml',
        'other.txt',
      ] as any);

      const response = await request(app).get('/recipes').expect(200);

      expect(response.body).toEqual({
        items: ['recipe1.yaml', 'recipe2.yml'],
      });
    });

    it('should return empty list when recipes directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(app).get('/recipes').expect(200);

      expect(response.body).toEqual({ items: [] });
    });

    it('should handle errors gracefully', async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const response = await request(app).get('/recipes').expect(500);

      expect(response.body).toEqual({ error: 'failed to list recipes' });
    });
  });

  describe('POST /recipes/run', () => {
    const mockLoadRecipe = require('../src/recipes/loader.js')
      .loadRecipe as jest.MockedFunction<any>;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockCrypto.randomUUID.mockReturnValue('test-uuid-123');
      mockLoadRecipe.mockResolvedValue({
        name: 'Test Recipe',
        description: 'Test recipe description',
        inputs: {},
      });
    });

    it('should validate required name parameter', async () => {
      const response = await request(app)
        .post('/recipes/run')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'name required' });
    });

    it('should return error for non-existent recipe', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['other.yaml'] as any);

      const response = await request(app)
        .post('/recipes/run')
        .send({ name: 'nonexistent' })
        .expect(404);

      expect(response.body.error).toContain("Recipe 'nonexistent' not found");
      expect(response.body.error).toContain('Available recipes: other.yaml');
    });

    it('should successfully run recipe with valid name', async () => {
      const response = await request(app)
        .post('/recipes/run')
        .send({
          name: 'test-recipe',
          inputs: { param1: 'value1' },
        })
        .expect(200);

      expect(response.body).toEqual({
        status: 'QUEUED',
        runId: 'recipe-run-test-uuid-123',
        auditId: 'audit-test-uuid-123',
        recipe: 'test-recipe.yaml',
        inputs: { param1: 'value1' },
      });
    });

    it('should handle recipe with .yml extension', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(false) // test-recipe.yaml
        .mockReturnValueOnce(true); // test-recipe.yml

      const response = await request(app)
        .post('/recipes/run')
        .send({ name: 'test-recipe' })
        .expect(200);

      expect(response.body.recipe).toBe('test-recipe.yml');
    });

    it('should handle recipe loading errors', async () => {
      mockLoadRecipe.mockResolvedValue({ __error: 'YAML parsing failed' });

      const response = await request(app)
        .post('/recipes/run')
        .send({ name: 'test-recipe' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Recipe loading error: YAML parsing failed',
      });
    });

    it('should validate required inputs', async () => {
      mockLoadRecipe.mockResolvedValue({
        name: 'Test Recipe',
        inputs: {
          requiredParam: { required: true },
          optionalParam: { required: false },
        },
      });

      const response = await request(app)
        .post('/recipes/run')
        .send({
          name: 'test-recipe',
          inputs: { optionalParam: 'value' },
        })
        .expect(400);

      expect(response.body).toEqual({
        error: "Required input 'requiredParam' is missing",
      });
    });

    it('should handle budget plugin requirement', async () => {
      process.env.REQUIRE_BUDGET_PLUGIN = 'true';

      const response = await request(app)
        .post('/recipes/run')
        .send({ name: 'test-recipe' })
        .expect(402);

      expect(response.body).toEqual({
        error: 'Budget plugin is required but not available',
      });

      delete process.env.REQUIRE_BUDGET_PLUGIN;
    });

    it('should accept user context from request', async () => {
      const appWithUser = express();
      appWithUser.use((req: any, _res, next) => {
        req.user = { id: 'user123' };
        next();
      });
      appWithUser.use(recipesRouter);

      const response = await request(appWithUser)
        .post('/recipes/run')
        .send({ name: 'test-recipe' })
        .expect(200);

      expect(response.body.status).toBe('QUEUED');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockLoadRecipe.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/recipes/run')
        .send({ name: 'test-recipe' })
        .expect(500);

      expect(response.body).toEqual({ error: 'failed to run recipe' });
    });
  });
});
