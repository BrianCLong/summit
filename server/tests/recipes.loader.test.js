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
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const globals_1 = require("@jest/globals");
let listRecipes;
let loadRecipe;
// Mock fs and path modules
globals_1.jest.mock('node:fs');
globals_1.jest.mock('node:path');
const mockFs = node_fs_1.default;
const mockPath = node_path_1.default;
describe('Recipe Loader', () => {
    beforeAll(async () => {
        const loader = await Promise.resolve().then(() => __importStar(require('../src/recipes/loader.js')));
        listRecipes = loader.listRecipes;
        loadRecipe = loader.loadRecipe;
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockPath.join.mockImplementation((...segments) => segments.join('/'));
    });
    describe('listRecipes', () => {
        it('should return list of YAML files from recipes directory', async () => {
            mockFs.readdirSync.mockReturnValue([
                'recipe1.yaml',
                'recipe2.yml',
                'not-a-recipe.txt',
                'config.json',
                'recipe3.yaml'
            ]);
            const recipes = await listRecipes();
            expect(recipes).toEqual(['recipe1.yaml', 'recipe2.yml', 'recipe3.yaml']);
            expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'recipes');
            expect(mockFs.readdirSync).toHaveBeenCalled();
        });
        it('should return empty array when directory cannot be read', async () => {
            mockFs.readdirSync.mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });
            const recipes = await listRecipes();
            expect(recipes).toEqual([]);
        });
        it('should return empty array when directory is empty', async () => {
            mockFs.readdirSync.mockReturnValue([]);
            const recipes = await listRecipes();
            expect(recipes).toEqual([]);
        });
    });
    describe('loadRecipe', () => {
        beforeEach(() => {
            mockFs.readFileSync.mockReturnValue(`
name: Test Recipe
description: A test recipe
version: "1.0"
inputs:
  param1:
    required: true
    type: string
  param2:
    required: false
    type: number
    default: 42
steps:
  - name: Step 1
    action: test
`);
        });
        it('should load and parse a valid YAML recipe', async () => {
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockReturnValue({
                name: 'Test Recipe',
                description: 'A test recipe',
            });
            const recipe = await loadRecipe('test-recipe.yaml');
            expect(recipe).toEqual({
                name: 'Test Recipe',
                description: 'A test recipe'
            });
            expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'recipes', 'test-recipe.yaml');
            expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('recipes/test-recipe.yaml'), 'utf8');
        });
        it('should return error object when YAML module is not available', async () => {
            const yamlContent = 'name: Test Recipe\ndescription: A test recipe';
            mockFs.readFileSync.mockReturnValue(yamlContent);
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockImplementation(() => {
                throw new Error('Module not found');
            });
            const recipe = await loadRecipe('test-recipe.yaml');
            expect(recipe).toEqual({
                __error: 'YAML module not installed',
                raw: yamlContent
            });
        });
        it('should handle file reading errors', async () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('ENOENT: no such file or directory');
            });
            // This should throw since we don't catch file system errors in loadRecipe
            await expect(loadRecipe('nonexistent.yaml')).rejects.toThrow('ENOENT');
        });
        it('should handle YAML parsing errors gracefully', async () => {
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockImplementation(() => {
                throw new Error('Invalid YAML syntax');
            });
            const recipe = await loadRecipe('invalid.yaml');
            expect(recipe).toEqual({
                __error: 'YAML module not installed',
                raw: expect.any(String)
            });
        });
        it('should work with different file extensions', async () => {
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockReturnValue({ name: 'YML Recipe' });
            await loadRecipe('recipe.yml');
            expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'recipes', 'recipe.yml');
        });
        it('should preserve original content in error case', async () => {
            const originalContent = 'name: Test\ninvalid: yaml: content';
            mockFs.readFileSync.mockReturnValue(originalContent);
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockImplementation(() => {
                throw new Error('Module not found');
            });
            const recipe = await loadRecipe('test.yaml');
            expect(recipe.raw).toBe(originalContent);
            expect(recipe.__error).toBe('YAML module not installed');
        });
    });
    describe('Integration scenarios', () => {
        it('should work end-to-end for listing and loading recipes', async () => {
            // Setup list operation
            mockFs.readdirSync.mockReturnValue(['recipe1.yaml', 'recipe2.yml']);
            // Setup load operation
            mockFs.readFileSync.mockReturnValue('name: Recipe 1\ndescription: First recipe');
            const yamlModule = await Promise.resolve().then(() => __importStar(require('yaml')));
            globals_1.jest.spyOn(yamlModule.default, 'parse').mockReturnValue({
                name: 'Recipe 1',
                description: 'First recipe',
            });
            // List recipes
            const recipes = await listRecipes();
            expect(recipes).toEqual(['recipe1.yaml', 'recipe2.yml']);
            // Load first recipe
            const recipe = await loadRecipe(recipes[0]);
            expect(recipe.name).toBe('Recipe 1');
        });
    });
});
