"use strict";
/**
 * UI Command Palette Integration
 *
 * Exposes extension commands to the UI command palette.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPaletteIntegration = void 0;
const types_js_1 = require("../types.js");
class CommandPaletteIntegration {
    registry;
    commands = new Map();
    widgets = new Map();
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Register all UI capabilities from loaded extensions
     */
    async registerAll() {
        const extensions = this.registry.getByCapability(types_js_1.ExtensionCapability.UI_COMMAND);
        for (const ext of extensions) {
            await this.registerExtension(ext);
        }
        console.info(`Registered ${this.commands.size} UI commands and ${this.widgets.size} widgets`);
    }
    /**
     * Register a single extension's UI capabilities
     */
    async registerExtension(ext) {
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
                }
                catch (err) {
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
                }
                catch (err) {
                    console.error(`Failed to register widget ${widgetDef.id}:`, err);
                }
            }
        }
    }
    /**
     * Create a UI command from extension definition
     */
    async createCommand(ext, cmdDef) {
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
    createWidget(ext, widgetDef) {
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
    getHandler(ext, entrypoint) {
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
    getCommands() {
        return Array.from(this.commands.values());
    }
    /**
     * Get a command by ID
     */
    getCommand(id) {
        return this.commands.get(id);
    }
    /**
     * Get all registered widgets
     */
    getWidgets() {
        return Array.from(this.widgets.values());
    }
    /**
     * Get a widget by ID
     */
    getWidget(id) {
        return this.widgets.get(id);
    }
    /**
     * Execute a command by ID
     */
    async executeCommand(id) {
        const command = this.commands.get(id);
        if (!command) {
            throw new Error(`Command ${id} not found`);
        }
        return await command.execute();
    }
    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        return this.getCommands().filter((cmd) => cmd.category === category);
    }
    /**
     * Search commands by title
     */
    searchCommands(query) {
        const lowerQuery = query.toLowerCase();
        return this.getCommands().filter((cmd) => cmd.title.toLowerCase().includes(lowerQuery));
    }
    /**
     * Unregister all UI capabilities
     */
    clear() {
        this.commands.clear();
        this.widgets.clear();
    }
}
exports.CommandPaletteIntegration = CommandPaletteIntegration;
