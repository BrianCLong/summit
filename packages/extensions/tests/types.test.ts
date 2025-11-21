/**
 * Extension Manifest Tests
 */

import { ExtensionManifestSchema, ExtensionType, ExtensionCapability, ExtensionPermission } from '../src/types.js';

describe('ExtensionManifestSchema', () => {
  const validManifest = {
    name: 'test-extension',
    displayName: 'Test Extension',
    version: '1.0.0',
    description: 'A test extension',
    type: ExtensionType.TOOL,
    capabilities: [ExtensionCapability.COPILOT_TOOL],
    permissions: [ExtensionPermission.READ_ENTITIES],
    entrypoints: {
      main: {
        type: 'function' as const,
        path: 'dist/index.js',
        export: 'activate',
      },
    },
  };

  it('should validate a correct manifest', () => {
    const result = ExtensionManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest without name', () => {
    const { name, ...manifestWithoutName } = validManifest;
    const result = ExtensionManifestSchema.safeParse(manifestWithoutName);
    expect(result.success).toBe(false);
  });

  it('should reject invalid extension name format', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      name: 'Invalid Name With Spaces',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid version format', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      version: 'not-a-version',
    });
    expect(result.success).toBe(false);
  });

  it('should accept pre-release versions', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      version: '1.0.0-beta.1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject manifest without capabilities', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      capabilities: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept manifest without permissions', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      permissions: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('should validate copilot tools configuration', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      copilot: {
        tools: [
          {
            name: 'my-tool',
            description: 'A test tool',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
              },
            },
            entrypoint: 'myTool',
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should validate UI commands configuration', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      ui: {
        commands: [
          {
            id: 'my-command',
            title: 'My Command',
            icon: '📊',
            category: 'Test',
            entrypoint: 'myCommand',
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should validate CLI commands configuration', () => {
    const result = ExtensionManifestSchema.safeParse({
      ...validManifest,
      cli: {
        commands: [
          {
            name: 'test',
            description: 'A test command',
            entrypoint: 'testCommand',
            arguments: [
              {
                name: 'input',
                description: 'Input file',
                required: true,
                type: 'string' as const,
              },
            ],
            options: [
              {
                name: 'output',
                alias: 'o',
                description: 'Output file',
                type: 'string' as const,
                default: 'output.json',
              },
            ],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
