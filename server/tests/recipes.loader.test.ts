import fs from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import { listRecipes, loadRecipe } from '../src/recipes/loader.js';

// Mock fs and path modules
jest.mock('node:fs');
jest.mock('node:path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Recipe Loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      ] as any);

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
      mockFs.readdirSync.mockReturnValue([] as any);

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
      // Mock dynamic import of yaml module
      const mockYAML = {
        parse: jest.fn().mockReturnValue({
          name: 'Test Recipe',
          description: 'A test recipe',
          version: '1.0',
          inputs: {
            param1: { required: true, type: 'string' },
            param2: { required: false, type: 'number', default: 42 }
          },
          steps: [{ name: 'Step 1', action: 'test' }]
        }),
        default: {
          parse: jest.fn().mockReturnValue({
            name: 'Test Recipe',
            description: 'A test recipe'
          })
        }
      };

      // Mock the dynamic import
      const originalImport = await import;
      global.import = jest.fn().mockResolvedValue({ default: mockYAML.default });

      const recipe = await loadRecipe('test-recipe.yaml');

      expect(recipe).toEqual({
        name: 'Test Recipe',
        description: 'A test recipe'
      });
      expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'recipes', 'test-recipe.yaml');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        'test-recipe.yaml',
        'utf8'
      );

      // Restore original import
      global.import = originalImport;
    });

    it('should return error object when YAML module is not available', async () => {
      const yamlContent = 'name: Test Recipe\ndescription: A test recipe';
      mockFs.readFileSync.mockReturnValue(yamlContent);

      // Mock failed dynamic import
      global.import = jest.fn().mockRejectedValue(new Error('Module not found'));

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
      const mockYAML = {
        default: {
          parse: jest.fn().mockImplementation(() => {
            throw new Error('Invalid YAML syntax');
          })
        }
      };

      global.import = jest.fn().mockResolvedValue(mockYAML);

      const recipe = await loadRecipe('invalid.yaml');

      expect(recipe).toEqual({
        __error: 'YAML module not installed',
        raw: expect.any(String)
      });
    });

    it('should work with different file extensions', async () => {
      const mockYAML = {
        default: {
          parse: jest.fn().mockReturnValue({ name: 'YML Recipe' })
        }
      };

      global.import = jest.fn().mockResolvedValue(mockYAML);

      await loadRecipe('recipe.yml');

      expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'recipes', 'recipe.yml');
    });

    it('should preserve original content in error case', async () => {
      const originalContent = 'name: Test\ninvalid: yaml: content';
      mockFs.readFileSync.mockReturnValue(originalContent);

      global.import = jest.fn().mockRejectedValue(new Error('Module not found'));

      const recipe = await loadRecipe('test.yaml');

      expect(recipe.raw).toBe(originalContent);
      expect(recipe.__error).toBe('YAML module not installed');
    });
  });

  describe('Integration scenarios', () => {
    it('should work end-to-end for listing and loading recipes', async () => {
      // Setup list operation
      mockFs.readdirSync.mockReturnValue(['recipe1.yaml', 'recipe2.yml'] as any);
      
      // Setup load operation
      mockFs.readFileSync.mockReturnValue('name: Recipe 1\ndescription: First recipe');
      
      const mockYAML = {
        default: {
          parse: jest.fn().mockReturnValue({
            name: 'Recipe 1',
            description: 'First recipe'
          })
        }
      };
      
      global.import = jest.fn().mockResolvedValue(mockYAML);

      // List recipes
      const recipes = await listRecipes();
      expect(recipes).toEqual(['recipe1.yaml', 'recipe2.yml']);

      // Load first recipe
      const recipe = await loadRecipe(recipes[0]);
      expect(recipe.name).toBe('Recipe 1');
    });
  });
});