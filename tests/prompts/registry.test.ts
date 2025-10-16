import { PromptRegistry } from '../../server/prompts/registry';
import path from 'path';
import fs from 'fs/promises';

describe('PromptRegistry', () => {
  let registry: PromptRegistry;
  const testPromptsDir = path.join(__dirname, 'fixtures');

  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(testPromptsDir, { recursive: true });

    // Create schema.json
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['meta', 'inputs', 'template'],
      properties: {
        meta: {
          type: 'object',
          required: ['id', 'owner', 'purpose'],
          properties: {
            id: { type: 'string' },
            owner: { type: 'string' },
            purpose: { type: 'string' },
            guardrails: { type: 'array' },
          },
        },
        inputs: { type: 'object' },
        template: { type: 'string' },
        examples: { type: 'array' },
      },
    };

    await fs.writeFile(
      path.join(testPromptsDir, 'schema.json'),
      JSON.stringify(schema, null, 2),
    );

    // Create test prompt
    const testPrompt = `
meta:
  id: test.simple@v1
  owner: test-team
  purpose: Simple test prompt
  guardrails:
    - "Never expose secrets"

inputs:
  name: string
  count: number
  items: array

template: |
  Hello {{name}}! You have {{count}} items:
  {{#items}}
  - {{.}}
  {{/items}}

examples:
  - name: basic-test
    inputs:
      name: "World"
      count: 2
      items: ["apple", "banana"]
    expected_contains:
      - "Hello World"
      - "2 items"
      - "apple"
      - "banana"
`;

    await fs.writeFile(
      path.join(testPromptsDir, 'test.simple@v1.yaml'),
      testPrompt,
    );

    registry = new PromptRegistry(testPromptsDir);
    await registry.initialize();
  });

  afterAll(async () => {
    // Clean up test fixtures
    await fs.rm(testPromptsDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    test('loads prompts from directory', () => {
      const prompt = registry.getPrompt('test.simple@v1');
      expect(prompt).toBeDefined();
      expect(prompt?.meta.id).toBe('test.simple@v1');
      expect(prompt?.meta.owner).toBe('test-team');
    });

    test('validates prompt schema', async () => {
      const invalidPrompt = `
meta:
  id: invalid@v1
  # missing required owner field
inputs: {}
template: "test"
`;

      const invalidPath = path.join(testPromptsDir, 'invalid.yaml');
      await fs.writeFile(invalidPath, invalidPrompt);

      await expect(registry.reloadPrompts()).rejects.toThrow(
        'Invalid prompt schema',
      );

      // Clean up
      await fs.unlink(invalidPath);
    });
  });

  describe('template rendering', () => {
    test('renders simple variables', () => {
      const result = registry.render('test.simple@v1', {
        name: 'Alice',
        count: 3,
        items: ['x', 'y', 'z'],
      });

      expect(result).toContain('Hello Alice!');
      expect(result).toContain('You have 3 items');
      expect(result).toContain('- x');
      expect(result).toContain('- y');
      expect(result).toContain('- z');
    });

    test('validates required inputs', () => {
      expect(() => {
        registry.render('test.simple@v1', {
          name: 'Alice',
          // missing count and items
        });
      }).toThrow('Missing required inputs');
    });

    test('validates input types', () => {
      expect(() => {
        registry.render('test.simple@v1', {
          name: 'Alice',
          count: 'not-a-number', // wrong type
          items: ['x', 'y'],
        });
      }).toThrow('Invalid type for count');
    });

    test('handles missing prompt', () => {
      expect(() => {
        registry.render('nonexistent@v1', {});
      }).toThrow('Prompt not found');
    });
  });

  describe('array rendering', () => {
    test('renders simple array items', () => {
      const result = registry.render('test.simple@v1', {
        name: 'Bob',
        count: 2,
        items: ['first', 'second'],
      });

      expect(result).toContain('- first');
      expect(result).toContain('- second');
    });

    test('handles empty arrays', () => {
      const result = registry.render('test.simple@v1', {
        name: 'Charlie',
        count: 0,
        items: [],
      });

      expect(result).toContain('Hello Charlie!');
      expect(result).toContain('0 items');
      expect(result.split('- ').length).toBe(1); // No items rendered
    });
  });

  describe('golden tests', () => {
    test('runs golden tests for all prompts', async () => {
      const results = await registry.runGoldenTests();

      expect(results).toHaveLength(1); // One example in our test prompt
      expect(results[0].promptId).toBe('test.simple@v1');
      expect(results[0].exampleName).toBe('basic-test');
      expect(results[0].passed).toBe(true);
    });

    test('runs golden tests for specific prompt', async () => {
      const results = await registry.runGoldenTests('test.simple@v1');

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].missingExpected).toEqual([]);
    });

    test('detects failing golden tests', async () => {
      // Create a prompt with failing example
      const failingPrompt = `
meta:
  id: test.failing@v1
  owner: test-team
  purpose: Failing test prompt

inputs:
  message: string

template: "Output: {{message}}"

examples:
  - name: will-fail
    inputs:
      message: "hello"
    expected_contains:
      - "hello"
      - "missing-text"
`;

      await fs.writeFile(
        path.join(testPromptsDir, 'test.failing@v1.yaml'),
        failingPrompt,
      );

      await registry.reloadPrompts();
      const results = await registry.runGoldenTests('test.failing@v1');

      expect(results[0].passed).toBe(false);
      expect(results[0].missingExpected).toContain('missing-text');

      // Clean up
      await fs.unlink(path.join(testPromptsDir, 'test.failing@v1.yaml'));
    });
  });

  describe('prompt management', () => {
    test('lists all prompts', () => {
      const prompts = registry.getAllPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.find((p) => p.meta.id === 'test.simple@v1')).toBeDefined();
    });

    test('reloads prompts', async () => {
      const initialCount = registry.getAllPrompts().length;

      // Add a new prompt file
      const newPrompt = `
meta:
  id: test.new@v1
  owner: test-team
  purpose: New test prompt
inputs:
  text: string
template: "New: {{text}}"
`;

      await fs.writeFile(
        path.join(testPromptsDir, 'test.new@v1.yaml'),
        newPrompt,
      );

      await registry.reloadPrompts();

      const newCount = registry.getAllPrompts().length;
      expect(newCount).toBe(initialCount + 1);
      expect(registry.getPrompt('test.new@v1')).toBeDefined();

      // Clean up
      await fs.unlink(path.join(testPromptsDir, 'test.new@v1.yaml'));
    });
  });
});
