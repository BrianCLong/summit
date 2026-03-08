"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const recipes_js_1 = __importDefault(require("../src/routes/recipes.js"));
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('../src/recipes/loader.js');
globals_1.jest.mock('../src/featureFlags/flagsmith.js');
globals_1.jest.mock('fs');
globals_1.jest.mock('crypto');
const mockFs = fs_1.default;
const mockCrypto = require('crypto');
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;
describeIf('Recipes REST API', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(recipes_js_1.default);
        globals_1.jest.clearAllMocks();
    });
    describe('GET /recipes', () => {
        it('should return list of recipe files', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue([
                'recipe1.yaml',
                'recipe2.yml',
                'other.txt',
            ]);
            const response = await (0, supertest_1.default)(app).get('/recipes').expect(200);
            expect(response.body).toEqual({
                items: ['recipe1.yaml', 'recipe2.yml'],
            });
        });
        it('should return empty list when recipes directory does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);
            const response = await (0, supertest_1.default)(app).get('/recipes').expect(200);
            expect(response.body).toEqual({ items: [] });
        });
        it('should handle errors gracefully', async () => {
            mockFs.existsSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const response = await (0, supertest_1.default)(app).get('/recipes').expect(500);
            expect(response.body).toEqual({ error: 'failed to list recipes' });
        });
    });
    describe('POST /recipes/run', () => {
        const mockLoadRecipe = require('../src/recipes/loader.js')
            .loadRecipe;
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
            const response = await (0, supertest_1.default)(app)
                .post('/recipes/run')
                .send({})
                .expect(400);
            expect(response.body).toEqual({ error: 'name required' });
        });
        it('should return error for non-existent recipe', async () => {
            mockFs.existsSync.mockReturnValue(false);
            mockFs.readdirSync.mockReturnValue(['other.yaml']);
            const response = await (0, supertest_1.default)(app)
                .post('/recipes/run')
                .send({ name: 'nonexistent' })
                .expect(404);
            expect(response.body.error).toContain("Recipe 'nonexistent' not found");
            expect(response.body.error).toContain('Available recipes: other.yaml');
        });
        it('should successfully run recipe with valid name', async () => {
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .post('/recipes/run')
                .send({ name: 'test-recipe' })
                .expect(200);
            expect(response.body.recipe).toBe('test-recipe.yml');
        });
        it('should handle recipe loading errors', async () => {
            mockLoadRecipe.mockResolvedValue({ __error: 'YAML parsing failed' });
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .post('/recipes/run')
                .send({ name: 'test-recipe' })
                .expect(402);
            expect(response.body).toEqual({
                error: 'Budget plugin is required but not available',
            });
            delete process.env.REQUIRE_BUDGET_PLUGIN;
        });
        it('should accept user context from request', async () => {
            const appWithUser = (0, express_1.default)();
            appWithUser.use((req, _res, next) => {
                req.user = { id: 'user123' };
                next();
            });
            appWithUser.use(recipes_js_1.default);
            const response = await (0, supertest_1.default)(appWithUser)
                .post('/recipes/run')
                .send({ name: 'test-recipe' })
                .expect(200);
            expect(response.body.status).toBe('QUEUED');
        });
        it('should handle unexpected errors gracefully', async () => {
            mockLoadRecipe.mockRejectedValue(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .post('/recipes/run')
                .send({ name: 'test-recipe' })
                .expect(500);
            expect(response.body).toEqual({ error: 'failed to run recipe' });
        });
    });
});
