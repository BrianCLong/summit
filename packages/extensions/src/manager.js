"use strict";
/**
 * Extension Manager
 *
 * High-level API for managing the entire extension system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionManager = void 0;
const loader_js_1 = require("./loader.js");
const enforcer_js_1 = require("./policy/enforcer.js");
const copilot_js_1 = require("./integrations/copilot.js");
const command_palette_js_1 = require("./integrations/command-palette.js");
const cli_js_1 = require("./integrations/cli.js");
/**
 * Central manager for the extension system
 */
class ExtensionManager {
    loader;
    registry;
    policyEnforcer;
    copilot;
    commandPalette;
    cli;
    initialized = false;
    constructor(options) {
        // Initialize policy enforcer if enabled
        if (options.enablePolicy !== false) {
            this.policyEnforcer = new enforcer_js_1.PolicyEnforcer(options.opaUrl);
        }
        // Initialize loader
        const loaderOptions = {
            extensionDirs: options.extensionDirs,
            configPath: options.configPath,
            storagePath: options.storagePath,
            api: options.api,
            policyEnforcer: this.policyEnforcer,
            autoLoad: options.autoLoad,
        };
        this.loader = new loader_js_1.ExtensionLoader(loaderOptions);
        this.registry = this.loader.getRegistry();
        // Initialize integrations
        this.copilot = new copilot_js_1.CopilotIntegration(this.registry);
        this.commandPalette = new command_palette_js_1.CommandPaletteIntegration(this.registry);
        this.cli = new cli_js_1.CLIIntegration(this.registry);
    }
    /**
     * Initialize the extension system (discover and load extensions)
     */
    async initialize() {
        if (this.initialized) {
            console.warn('Extension manager already initialized');
            return;
        }
        console.info('Initializing extension system...');
        // Discover extensions
        await this.loader.discover();
        // Load extensions
        await this.loader.loadAll();
        // Register integrations
        await this.copilot.registerAll();
        await this.commandPalette.registerAll();
        await this.cli.registerAll();
        this.initialized = true;
        const stats = this.registry.getStats();
        console.info(`Extension system initialized: ${stats.loaded}/${stats.total} extensions loaded`);
    }
    /**
     * Reload all extensions
     */
    async reload() {
        console.info('Reloading extension system...');
        // Clear integrations
        this.copilot.clear();
        this.commandPalette.clear();
        this.cli.clear();
        // Reload extensions
        await this.loader.reload();
        // Re-register integrations
        await this.copilot.registerAll();
        await this.commandPalette.registerAll();
        await this.cli.registerAll();
        console.info('Extension system reloaded');
    }
    /**
     * Shutdown the extension system
     */
    async shutdown() {
        if (!this.initialized) {
            return;
        }
        console.info('Shutting down extension system...');
        // Unload all extensions
        await this.loader.unloadAll();
        // Clear integrations
        this.copilot.clear();
        this.commandPalette.clear();
        this.cli.clear();
        this.initialized = false;
        console.info('Extension system shut down');
    }
    /**
     * Get the extension registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Check if the extension system is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get extension statistics
     */
    getStats() {
        return {
            ...this.registry.getStats(),
            copilot: {
                tools: this.copilot.getTools().length,
                skills: this.copilot.getSkills().length,
            },
            ui: {
                commands: this.commandPalette.getCommands().length,
                widgets: this.commandPalette.getWidgets().length,
            },
            cli: {
                commands: this.cli.getCommands().length,
            },
        };
    }
    /**
     * Load OPA policy for extension permissions
     */
    async loadPolicy(policyRego) {
        if (!this.policyEnforcer) {
            throw new Error('Policy enforcement is not enabled');
        }
        await this.policyEnforcer.loadPolicy(policyRego);
    }
}
exports.ExtensionManager = ExtensionManager;
