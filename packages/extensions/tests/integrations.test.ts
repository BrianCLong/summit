/**
 * Integration Tests for Copilot, UI, and CLI
 */

import { ExtensionRegistry } from '../src/registry.js';
import { CopilotIntegration } from '../src/integrations/copilot.js';
import { CommandPaletteIntegration } from '../src/integrations/command-palette.js';
import { CLIIntegration } from '../src/integrations/cli.js';
import { ExtensionManifest, ExtensionType, ExtensionCapability } from '../src/types.js';

describe('CopilotIntegration', () => {
  let registry: ExtensionRegistry;
  let copilot: CopilotIntegration;

  const createLoadedExtension = (
    name: string,
    manifest: Partial<ExtensionManifest>,
    module: any
  ) => {
    const fullManifest: ExtensionManifest = {
      name,
      displayName: name,
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.TOOL,
      capabilities: [ExtensionCapability.COPILOT_TOOL],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        testTool: { type: 'function', path: 'tools.js', export: 'testTool' },
      },
      ...manifest,
    };
    registry.register(fullManifest, '/test');
    registry.markLoaded(name, module);
  };

  beforeEach(() => {
    registry = new ExtensionRegistry();
    copilot = new CopilotIntegration(registry);
  });

  describe('registerAll', () => {
    it('should register tools from extensions', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });

      createLoadedExtension(
        'test-ext',
        {
          copilot: {
            tools: [
              {
                name: 'my-tool',
                description: 'A test tool',
                parameters: { type: 'object', properties: {} },
                entrypoint: 'testTool',
              },
            ],
          },
        },
        { testTool: mockHandler }
      );

      await copilot.registerAll();

      const tools = copilot.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-ext:my-tool');
    });
  });

  describe('executeTool', () => {
    it('should execute registered tool', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'result' });

      createLoadedExtension(
        'test-ext',
        {
          copilot: {
            tools: [
              {
                name: 'my-tool',
                description: 'A test tool',
                parameters: { type: 'object', properties: {} },
                entrypoint: 'testTool',
              },
            ],
          },
        },
        { testTool: mockHandler }
      );

      await copilot.registerAll();
      const result = await copilot.executeTool('test-ext:my-tool', { query: 'test' });

      expect(mockHandler).toHaveBeenCalledWith({ query: 'test' });
      expect(result).toEqual({ data: 'result' });
    });

    it('should throw for non-existent tool', async () => {
      await expect(copilot.executeTool('non-existent', {})).rejects.toThrow(
        'Tool non-existent not found'
      );
    });
  });

  describe('clear', () => {
    it('should remove all tools', async () => {
      createLoadedExtension(
        'test-ext',
        {
          copilot: {
            tools: [
              {
                name: 'my-tool',
                description: 'A test tool',
                parameters: { type: 'object', properties: {} },
                entrypoint: 'testTool',
              },
            ],
          },
        },
        { testTool: jest.fn() }
      );

      await copilot.registerAll();
      expect(copilot.getTools()).toHaveLength(1);

      copilot.clear();
      expect(copilot.getTools()).toHaveLength(0);
    });
  });
});

describe('CommandPaletteIntegration', () => {
  let registry: ExtensionRegistry;
  let palette: CommandPaletteIntegration;

  beforeEach(() => {
    registry = new ExtensionRegistry();
    palette = new CommandPaletteIntegration(registry);
  });

  it('should register UI commands from extensions', async () => {
    const mockHandler = jest.fn().mockResolvedValue(undefined);

    const manifest: ExtensionManifest = {
      name: 'ui-ext',
      displayName: 'UI Extension',
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.COMMAND,
      capabilities: [ExtensionCapability.UI_COMMAND],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        showCmd: { type: 'function', path: 'cmd.js', export: 'showCommand' },
      },
      ui: {
        commands: [
          {
            id: 'show-panel',
            title: 'Show Panel',
            icon: '📊',
            category: 'Test',
            entrypoint: 'showCmd',
          },
        ],
      },
    };

    registry.register(manifest, '/test');
    registry.markLoaded('ui-ext', { showCommand: mockHandler });

    await palette.registerAll();

    const commands = palette.getCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].id).toBe('ui-ext.show-panel');
    expect(commands[0].title).toBe('Show Panel');
  });

  it('should search commands', async () => {
    const manifest: ExtensionManifest = {
      name: 'search-ext',
      displayName: 'Search Extension',
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.COMMAND,
      capabilities: [ExtensionCapability.UI_COMMAND],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        cmdA: { type: 'function', path: 'a.js' },
        cmdB: { type: 'function', path: 'b.js' },
      },
      ui: {
        commands: [
          { id: 'analytics-panel', title: 'Show Analytics Panel', entrypoint: 'cmdA' },
          { id: 'settings', title: 'Open Settings', entrypoint: 'cmdB' },
        ],
      },
    };

    registry.register(manifest, '/test');
    registry.markLoaded('search-ext', { default: jest.fn() });

    await palette.registerAll();

    const results = palette.searchCommands('analytics');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('search-ext.analytics-panel');
  });
});

describe('CLIIntegration', () => {
  let registry: ExtensionRegistry;
  let cli: CLIIntegration;

  beforeEach(() => {
    registry = new ExtensionRegistry();
    cli = new CLIIntegration(registry);
  });

  it('should register CLI commands from extensions', async () => {
    const mockHandler = jest.fn().mockResolvedValue('output');

    const manifest: ExtensionManifest = {
      name: 'cli-ext',
      displayName: 'CLI Extension',
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.COMMAND,
      capabilities: [ExtensionCapability.UI_COMMAND],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        analyzeCmd: { type: 'function', path: 'analyze.js', export: 'analyze' },
      },
      cli: {
        commands: [
          {
            name: 'analyze',
            description: 'Analyze data',
            entrypoint: 'analyzeCmd',
            arguments: [{ name: 'file', description: 'Input file', required: true }],
            options: [{ name: 'format', alias: 'f', description: 'Output format', default: 'json' }],
          },
        ],
      },
    };

    registry.register(manifest, '/test');
    registry.markLoaded('cli-ext', { analyze: mockHandler });

    await cli.registerAll();

    const commands = cli.getCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0].name).toBe('cli-ext:analyze');
  });

  it('should execute CLI command', async () => {
    const mockHandler = jest.fn().mockResolvedValue('result');

    const manifest: ExtensionManifest = {
      name: 'exec-ext',
      displayName: 'Exec Extension',
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.COMMAND,
      capabilities: [ExtensionCapability.UI_COMMAND],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        runCmd: { type: 'function', path: 'run.js', export: 'run' },
      },
      cli: {
        commands: [
          {
            name: 'run',
            description: 'Run command',
            entrypoint: 'runCmd',
          },
        ],
      },
    };

    registry.register(manifest, '/test');
    registry.markLoaded('exec-ext', { run: mockHandler });

    await cli.registerAll();

    const result = await cli.executeCommand('exec-ext:run', { file: 'test.csv' }, { verbose: true });

    expect(mockHandler).toHaveBeenCalledWith({ file: 'test.csv' }, { verbose: true });
    expect(result).toBe('result');
  });

  it('should generate help text', async () => {
    const manifest: ExtensionManifest = {
      name: 'help-ext',
      displayName: 'Help Extension',
      version: '1.0.0',
      description: 'Test',
      type: ExtensionType.COMMAND,
      capabilities: [ExtensionCapability.UI_COMMAND],
      permissions: [],
      entrypoints: {
        main: { type: 'function', path: 'index.js' },
        helpCmd: { type: 'function', path: 'help.js' },
      },
      cli: {
        commands: [
          {
            name: 'process',
            description: 'Process files',
            entrypoint: 'helpCmd',
            arguments: [
              { name: 'input', description: 'Input file', required: true, type: 'string' },
            ],
            options: [
              { name: 'output', alias: 'o', description: 'Output file', type: 'string', default: 'out.json' },
            ],
          },
        ],
      },
    };

    registry.register(manifest, '/test');
    registry.markLoaded('help-ext', { default: jest.fn() });

    await cli.registerAll();

    const help = cli.getCommandHelp('help-ext:process');
    expect(help).toContain('help-ext:process');
    expect(help).toContain('Process files');
    expect(help).toContain('input');
    expect(help).toContain('--output');
  });
});
