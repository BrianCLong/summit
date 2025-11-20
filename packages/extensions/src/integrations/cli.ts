/**
 * CLI Integration
 *
 * Exposes extension commands to the CLI.
 */

import { ExtensionRegistry } from '../registry.js';
import { Extension } from '../types.js';

export interface CLICommand {
  name: string;
  description: string;
  extension: string;
  arguments?: CLIArgument[];
  options?: CLIOption[];
  execute: (args: any, options: any) => Promise<any>;
}

export interface CLIArgument {
  name: string;
  description: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
}

export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type?: 'string' | 'number' | 'boolean';
  default?: any;
}

export class CLIIntegration {
  private registry: ExtensionRegistry;
  private commands = new Map<string, CLICommand>();

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  /**
   * Register all CLI commands from loaded extensions
   */
  async registerAll(): Promise<void> {
    const extensions = this.registry.getLoaded();

    for (const ext of extensions) {
      if (ext.manifest.cli?.commands) {
        await this.registerExtension(ext);
      }
    }

    console.info(`Registered ${this.commands.size} CLI commands`);
  }

  /**
   * Register a single extension's CLI commands
   */
  private async registerExtension(ext: Extension): Promise<void> {
    const { manifest } = ext;

    if (!manifest.cli?.commands) {
      return;
    }

    for (const cmdDef of manifest.cli.commands) {
      try {
        const command = await this.createCommand(ext, cmdDef);
        this.commands.set(command.name, command);
        console.debug(`Registered CLI command: ${command.name}`);
      } catch (err) {
        console.error(`Failed to register CLI command ${cmdDef.name}:`, err);
      }
    }
  }

  /**
   * Create a CLI command from extension definition
   */
  private async createCommand(ext: Extension, cmdDef: any): Promise<CLICommand> {
    const entrypoint = ext.manifest.entrypoints[cmdDef.entrypoint];
    if (!entrypoint) {
      throw new Error(`Entrypoint ${cmdDef.entrypoint} not found`);
    }

    const handler = this.getHandler(ext, entrypoint);

    return {
      name: `${ext.manifest.name}:${cmdDef.name}`,
      description: cmdDef.description,
      extension: ext.manifest.name,
      arguments: cmdDef.arguments,
      options: cmdDef.options,
      execute: async (args: any, options: any) => {
        console.debug(`Executing CLI command ${cmdDef.name}`);
        return await handler(args, options);
      },
    };
  }

  /**
   * Get handler function from extension module
   */
  private getHandler(ext: Extension, entrypoint: any): Function {
    const { module } = ext;

    if (!module) {
      throw new Error(`Extension ${ext.manifest.name} not loaded`);
    }

    const exportName = entrypoint.export || 'default';
    const exported = module[exportName];

    if (!exported) {
      throw new Error(`Export ${exportName} not found`);
    }

    if (entrypoint.handler) {
      const handler = exported[entrypoint.handler];
      if (typeof handler !== 'function') {
        throw new Error(`Handler ${entrypoint.handler} is not a function`);
      }
      return handler.bind(exported);
    }

    if (typeof exported !== 'function') {
      throw new Error(`Export ${exportName} is not a function`);
    }

    return exported;
  }

  /**
   * Get all registered commands
   */
  getCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Execute a command by name
   */
  async executeCommand(name: string, args: any = {}, options: any = {}): Promise<any> {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`CLI command ${name} not found`);
    }
    return await command.execute(args, options);
  }

  /**
   * Get commands by extension
   */
  getCommandsByExtension(extensionName: string): CLICommand[] {
    return this.getCommands().filter((cmd) => cmd.extension === extensionName);
  }

  /**
   * Generate help text for a command
   */
  getCommandHelp(name: string): string {
    const cmd = this.commands.get(name);
    if (!cmd) {
      return `Command ${name} not found`;
    }

    let help = `${cmd.name} - ${cmd.description}\n\n`;

    if (cmd.arguments && cmd.arguments.length > 0) {
      help += 'Arguments:\n';
      for (const arg of cmd.arguments) {
        const required = arg.required ? '(required)' : '(optional)';
        const type = arg.type ? `<${arg.type}>` : '';
        help += `  ${arg.name} ${type} ${required}\n    ${arg.description}\n`;
      }
      help += '\n';
    }

    if (cmd.options && cmd.options.length > 0) {
      help += 'Options:\n';
      for (const opt of cmd.options) {
        const alias = opt.alias ? `, -${opt.alias}` : '';
        const type = opt.type ? `<${opt.type}>` : '';
        const defaultVal = opt.default !== undefined ? `(default: ${opt.default})` : '';
        help += `  --${opt.name}${alias} ${type} ${defaultVal}\n    ${opt.description}\n`;
      }
    }

    return help;
  }

  /**
   * Unregister all CLI commands
   */
  clear(): void {
    this.commands.clear();
  }
}
