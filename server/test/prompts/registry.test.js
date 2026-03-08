"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("../../prompts/registry");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('PromptRegistry', () => {
    let registry;
    const testPromptsDir = path_1.default.join(__dirname, 'fixtures');
    (0, globals_1.beforeAll)(async () => {
        // Create test fixtures directory
        await promises_1.default.mkdir(testPromptsDir, { recursive: true });
        // Create schema.json
        const schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Maestro Prompt Template",
            "type": "object",
            "required": ["meta", "modelConfig", "inputs", "template"],
            "properties": {
                "meta": {
                    "type": "object",
                    "required": ["id", "owner", "purpose"],
                    "properties": {
                        "id": {
                            "type": "string",
                            "pattern": "^[a-z0-9-]+\\.[a-z0-9-]+@v[0-9]+$",
                            "description": "Unique identifier with version (e.g. implement.fix-test@v1)"
                        },
                        "owner": { "type": "string" },
                        "purpose": { "type": "string" },
                        "tags": { "type": "array", "items": { "type": "string" } },
                        "guardrails": { "type": "array", "items": { "type": "string" } }
                    }
                },
                "modelConfig": {
                    "type": "object",
                    "required": ["model"],
                    "properties": {
                        "model": { "type": "string" },
                        "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
                        "maxTokens": { "type": "number" },
                        "topP": { "type": "number" },
                        "stop": { "type": "array", "items": { "type": "string" } }
                    }
                },
                "inputs": {
                    "type": "object",
                    "patternProperties": {
                        "^[a-zA-Z_][a-zA-Z0-9_]*$": { "type": "string" }
                    }
                },
                "template": { "type": "string" },
                "outputSchema": { "type": "object" },
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "inputs"],
                        "properties": {
                            "name": { "type": "string" },
                            "inputs": { "type": "object" },
                            "expected_contains": { "type": "array", "items": { "type": "string" } },
                            "expected_output": { "type": "string" }
                        }
                    }
                }
            }
        };
        await promises_1.default.writeFile(path_1.default.join(testPromptsDir, 'schema.json'), JSON.stringify(schema, null, 2));
        // Create test prompt
        const testPrompt = `
meta:
  id: test.simple@v1
  owner: test-team
  purpose: Simple test prompt
  guardrails:
    - "Never expose secrets"

modelConfig:
  model: 'gpt-4'
  temperature: 0.0

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
        await promises_1.default.writeFile(path_1.default.join(testPromptsDir, 'test.simple@v1.yaml'), testPrompt);
        registry = new registry_1.PromptRegistry(testPromptsDir);
        await registry.initialize();
    });
    (0, globals_1.afterAll)(async () => {
        // Clean up test fixtures
        await promises_1.default.rm(testPromptsDir, { recursive: true, force: true });
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.test)('loads prompts from directory', () => {
            const prompt = registry.getPrompt('test.simple@v1');
            (0, globals_1.expect)(prompt).toBeDefined();
            (0, globals_1.expect)(prompt?.meta.id).toBe('test.simple@v1');
            (0, globals_1.expect)(prompt?.meta.owner).toBe('test-team');
            (0, globals_1.expect)(prompt?.modelConfig.model).toBe('gpt-4');
        });
        (0, globals_1.test)('validates prompt schema', async () => {
            const invalidPrompt = `
meta:
  id: invalid@v1
  # missing required owner field
# missing modelConfig
inputs: {}
template: "test"
`;
            const invalidPath = path_1.default.join(testPromptsDir, 'invalid.yaml');
            await promises_1.default.writeFile(invalidPath, invalidPrompt);
            await (0, globals_1.expect)(registry.reloadPrompts()).rejects.toThrow('Invalid prompt schema');
            // Clean up
            await promises_1.default.unlink(invalidPath);
            await registry.reloadPrompts();
        });
    });
    (0, globals_1.describe)('template rendering', () => {
        (0, globals_1.test)('renders simple variables', () => {
            const result = registry.render('test.simple@v1', {
                name: 'Alice',
                count: 3,
                items: ['x', 'y', 'z'],
            });
            (0, globals_1.expect)(result).toContain('Hello Alice!');
            (0, globals_1.expect)(result).toContain('You have 3 items');
            (0, globals_1.expect)(result).toContain('- x');
            (0, globals_1.expect)(result).toContain('- y');
            (0, globals_1.expect)(result).toContain('- z');
        });
        (0, globals_1.test)('validates required inputs', () => {
            (0, globals_1.expect)(() => {
                registry.render('test.simple@v1', {
                    name: 'Alice',
                    // missing count and items
                });
            }).toThrow('Missing required inputs');
        });
        (0, globals_1.test)('validates input types', () => {
            (0, globals_1.expect)(() => {
                registry.render('test.simple@v1', {
                    name: 'Alice',
                    count: 'not-a-number', // wrong type
                    items: ['x', 'y'],
                });
            }).toThrow('Invalid type for count');
        });
        (0, globals_1.test)('handles missing prompt', () => {
            (0, globals_1.expect)(() => {
                registry.render('nonexistent@v1', {});
            }).toThrow('Prompt not found');
        });
    });
    (0, globals_1.describe)('array rendering', () => {
        (0, globals_1.test)('renders simple array items', () => {
            const result = registry.render('test.simple@v1', {
                name: 'Bob',
                count: 2,
                items: ['first', 'second'],
            });
            (0, globals_1.expect)(result).toContain('- first');
            (0, globals_1.expect)(result).toContain('- second');
        });
        (0, globals_1.test)('handles empty arrays', () => {
            const result = registry.render('test.simple@v1', {
                name: 'Charlie',
                count: 0,
                items: [],
            });
            (0, globals_1.expect)(result).toContain('Hello Charlie!');
            (0, globals_1.expect)(result).toContain('0 items');
            (0, globals_1.expect)(result.split('- ').length).toBe(1); // No items rendered
        });
    });
    (0, globals_1.describe)('golden tests', () => {
        (0, globals_1.test)('runs golden tests for all prompts', async () => {
            const results = await registry.runGoldenTests();
            (0, globals_1.expect)(results).toHaveLength(1); // One example in our test prompt
            (0, globals_1.expect)(results[0].promptId).toBe('test.simple@v1');
            (0, globals_1.expect)(results[0].exampleName).toBe('basic-test');
            (0, globals_1.expect)(results[0].passed).toBe(true);
        });
        (0, globals_1.test)('runs golden tests for specific prompt', async () => {
            const results = await registry.runGoldenTests('test.simple@v1');
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].passed).toBe(true);
            (0, globals_1.expect)(results[0].missingExpected).toEqual([]);
        });
        (0, globals_1.test)('detects failing golden tests', async () => {
            // Create a prompt with failing example
            const failingPrompt = `
meta:
  id: test.failing@v1
  owner: test-team
  purpose: Failing test prompt

modelConfig:
  model: 'gpt-4'

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
            await promises_1.default.writeFile(path_1.default.join(testPromptsDir, 'test.failing@v1.yaml'), failingPrompt);
            await registry.reloadPrompts();
            const results = await registry.runGoldenTests('test.failing@v1');
            (0, globals_1.expect)(results[0].passed).toBe(false);
            (0, globals_1.expect)(results[0].missingExpected).toContain('missing-text');
            // Clean up
            await promises_1.default.unlink(path_1.default.join(testPromptsDir, 'test.failing@v1.yaml'));
            await registry.reloadPrompts();
        });
    });
    (0, globals_1.describe)('prompt management', () => {
        (0, globals_1.test)('lists all prompts', () => {
            const prompts = registry.getAllPrompts();
            (0, globals_1.expect)(prompts.length).toBeGreaterThan(0);
            (0, globals_1.expect)(prompts.find((p) => p.meta.id === 'test.simple@v1')).toBeDefined();
        });
        (0, globals_1.test)('reloads prompts', async () => {
            const initialCount = registry.getAllPrompts().length;
            // Add a new prompt file
            const newPrompt = `
meta:
  id: test.new@v1
  owner: test-team
  purpose: New test prompt
modelConfig:
  model: 'gpt-4'
inputs:
  text: string
template: "New: {{text}}"
`;
            await promises_1.default.writeFile(path_1.default.join(testPromptsDir, 'test.new@v1.yaml'), newPrompt);
            await registry.reloadPrompts();
            const newCount = registry.getAllPrompts().length;
            (0, globals_1.expect)(newCount).toBe(initialCount + 1);
            (0, globals_1.expect)(registry.getPrompt('test.new@v1')).toBeDefined();
            // Clean up
            await promises_1.default.unlink(path_1.default.join(testPromptsDir, 'test.new@v1.yaml'));
        });
    });
});
