/**
 * UI Command Palette Integration
 *
 * Exposes extension commands to the UI command palette.
 */

import { ExtensionRegistry } from '../registry.js';
import { Extension, ExtensionCapability } from '../types.js';

export interface UICommand {
  id: string;
  title: string;
  icon?: string;
  category?: string;
  extension: string;
  execute: () => Promise<any>;
}

export interface UIWidget {
  id: string;
  title: string;
  component: string;
  placement?: 'dashboard' | 'sidebar' | 'panel';
  extension: string;
}

export class CommandPaletteIntegration {
  private registry: ExtensionRegistry;
  private commands = new Map<string, UICommand>();
  private widgets = new Map<string, UIWidget>();

  constructor(registry: ExtensionRegistry) {
    this.registry = registry;
  }

  /**
   * Register all UI capabilities from loaded extensions
   */
  async registerAll(): Promise<void> {
    const extensions = this.registry.getByCapability(ExtensionCapability.UI_COMMAND);

    for (const ext of extensions) {
      await this.registerExtension(ext);
    }

    console.info(
      `Registered ${this.commands.size} UI commands and ${this.widgets.size} widgets`
    );
  }

  /**
   * Register a single extension's UI capabilities
   */
  private async registerExtension(ext: Extension): Promise<void> {
    const { manifest } = ext;

    if (!manifest.ui) {
      return;
    }

    // Register commands
    if (manifest.ui.commands) {
      for (const cmdDef of manifest.ui.commands) {
        try {
          const command = await this.createCommand(ext, cmdDef);
          this.commands.set(command.id, command);
          console.debug(`Registered UI command: ${command.id}`);
        } catch (err) {
          console.error(`Failed to register command ${cmdDef.id}:`, err);
        }
      }
    }

    // Register widgets
    if (manifest.ui.widgets) {
      for (const widgetDef of manifest.ui.widgets) {
        try {
          const widget = this.createWidget(ext, widgetDef);
          this.widgets.set(widget.id, widget);
          console.debug(`Registered UI widget: ${widget.id}`);
        } catch (err) {
          console.error(`Failed to register widget ${widgetDef.id}:`, err);
        }
      }
    }
  }

  /**
   * Create a UI command from extension definition
   */
  private async createCommand(ext: Extension, cmdDef: any): Promise<UICommand> {
    const entrypoint = ext.manifest.entrypoints[cmdDef.entrypoint];
    if (!entrypoint) {
      throw new Error(`Entrypoint ${cmdDef.entrypoint} not found`);
    }

    const handler = this.getHandler(ext, entrypoint);

    return {
      id: `${ext.manifest.name}.${cmdDef.id}`,
      title: cmdDef.title,
      icon: cmdDef.icon,
      category: cmdDef.category || ext.manifest.displayName,
      extension: ext.manifest.name,
      execute: async () => {
        console.debug(`Executing command ${cmdDef.id}`);
        return await handler();
      },
    };
  }

  /**
   * Create a UI widget from extension definition
   */
  private createWidget(ext: Extension, widgetDef: any): UIWidget {
    return {
      id: `${ext.manifest.name}.${widgetDef.id}`,
      title: widgetDef.title,
      component: widgetDef.component,
      placement: widgetDef.placement,
      extension: ext.manifest.name,
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
  getCommands(): UICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get a command by ID
   */
  getCommand(id: string): UICommand | undefined {
    return this.commands.get(id);
  }

  /**
   * Get all registered widgets
   */
  getWidgets(): UIWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get a widget by ID
   */
  getWidget(id: string): UIWidget | undefined {
    return this.widgets.get(id);
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(id: string): Promise<any> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command ${id} not found`);
    }
    return await command.execute();
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): UICommand[] {
    return this.getCommands().filter((cmd) => cmd.category === category);
  }

  /**
   * Search commands by title
   */
  searchCommands(query: string): UICommand[] {
    const lowerQuery = query.toLowerCase();
    return this.getCommands().filter((cmd) =>
      cmd.title.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Unregister all UI capabilities
   */
  clear(): void {
    this.commands.clear();
    this.widgets.clear();
  }
}
