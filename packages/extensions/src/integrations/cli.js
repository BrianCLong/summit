"use strict";
/**
 * CLI Integration
 *
 * Exposes extension commands to the CLI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIIntegration = void 0;
class CLIIntegration {
    registry;
    commands = new Map();
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Register all CLI commands from loaded extensions
     */
    async registerAll() {
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
    async registerExtension(ext) {
        const { manifest } = ext;
        if (!manifest.cli?.commands) {
            return;
        }
        for (const cmdDef of manifest.cli.commands) {
            try {
                const command = await this.createCommand(ext, cmdDef);
                this.commands.set(command.name, command);
                console.debug(`Registered CLI command: ${command.name}`);
            }
            catch (err) {
                console.error(`Failed to register CLI command ${cmdDef.name}:`, err);
            }
        }
    }
    /**
     * Create a CLI command from extension definition
     */
    async createCommand(ext, cmdDef) {
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
            execute: async (args, options) => {
                console.debug(`Executing CLI command ${cmdDef.name}`);
                return await handler(args, options);
            },
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
     * Get a command by name
     */
    getCommand(name) {
        return this.commands.get(name);
    }
    /**
     * Execute a command by name
     */
    async executeCommand(name, args = {}, options = {}) {
        const command = this.commands.get(name);
        if (!command) {
            throw new Error(`CLI command ${name} not found`);
        }
        return await command.execute(args, options);
    }
    /**
     * Get commands by extension
     */
    getCommandsByExtension(extensionName) {
        return this.getCommands().filter((cmd) => cmd.extension === extensionName);
    }
    /**
     * Generate help text for a command
     */
    getCommandHelp(name) {
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
    clear() {
        this.commands.clear();
    }
}
exports.CLIIntegration = CLIIntegration;
