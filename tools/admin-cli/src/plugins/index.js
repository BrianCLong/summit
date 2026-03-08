"use strict";
/**
 * Plugin System for Admin CLI
 * Enables extensibility through custom commands and hooks
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginRegistry = void 0;
exports.loadPlugins = loadPlugins;
exports.getPluginDirectories = getPluginDirectories;
exports.createPluginContext = createPluginContext;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_url_1 = require("node:url");
const logger_js_1 = require("../utils/logger.js");
/**
 * Plugin registry
 */
class PluginRegistry {
    plugins = new Map();
    hooks = {
        preCommand: [],
        postCommand: [],
        onError: [],
        onOutput: [],
        onAudit: [],
    };
    /**
     * Register a plugin
     */
    register(plugin) {
        if (this.plugins.has(plugin.name)) {
            logger_js_1.logger.warn(`Plugin "${plugin.name}" is already registered, skipping`);
            return;
        }
        this.plugins.set(plugin.name, plugin);
        // Register hooks
        if (plugin.hooks) {
            if (plugin.hooks.preCommand) {
                this.hooks.preCommand.push(plugin.hooks.preCommand);
            }
            if (plugin.hooks.postCommand) {
                this.hooks.postCommand.push(plugin.hooks.postCommand);
            }
            if (plugin.hooks.onError) {
                this.hooks.onError.push(plugin.hooks.onError);
            }
            if (plugin.hooks.onOutput) {
                this.hooks.onOutput.push(plugin.hooks.onOutput);
            }
            if (plugin.hooks.onAudit) {
                this.hooks.onAudit.push(plugin.hooks.onAudit);
            }
        }
        logger_js_1.logger.verbose(`Plugin registered: ${plugin.name} v${plugin.version}`);
    }
    /**
     * Unregister a plugin
     */
    unregister(name) {
        return this.plugins.delete(name);
    }
    /**
     * Get all registered plugins
     */
    getAll() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get plugin by name
     */
    get(name) {
        return this.plugins.get(name);
    }
    /**
     * Execute pre-command hooks
     */
    async executePreCommand(context) {
        for (const hook of this.hooks.preCommand) {
            await hook(context);
        }
    }
    /**
     * Execute post-command hooks
     */
    async executePostCommand(context, result) {
        for (const hook of this.hooks.postCommand) {
            await hook(context, result);
        }
    }
    /**
     * Execute error hooks
     */
    async executeOnError(context, error) {
        for (const hook of this.hooks.onError) {
            await hook(context, error);
        }
    }
    /**
     * Execute output hooks
     */
    async executeOnOutput(data, format) {
        let result = data;
        for (const hook of this.hooks.onOutput) {
            result = await hook(result, format);
        }
        return result;
    }
    /**
     * Execute audit hooks
     */
    async executeOnAudit(event) {
        let result = event;
        for (const hook of this.hooks.onAudit) {
            result = await hook(result);
        }
        return result;
    }
    /**
     * Register commands from all plugins
     */
    registerCommands(program) {
        for (const plugin of this.plugins.values()) {
            if (plugin.commands) {
                try {
                    plugin.commands(program);
                    logger_js_1.logger.verbose(`Commands registered from plugin: ${plugin.name}`);
                }
                catch (err) {
                    logger_js_1.logger.error(`Failed to register commands from plugin ${plugin.name}`, {
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            }
        }
    }
}
/**
 * Global plugin registry
 */
exports.pluginRegistry = new PluginRegistry();
/**
 * Load plugins from directory
 */
async function loadPlugins(pluginDir, context) {
    if (!(0, node_fs_1.existsSync)(pluginDir)) {
        logger_js_1.logger.verbose(`Plugin directory does not exist: ${pluginDir}`);
        return;
    }
    const entries = (0, node_fs_1.readdirSync)(pluginDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const pluginPath = (0, node_path_1.join)(pluginDir, entry.name);
        const packagePath = (0, node_path_1.join)(pluginPath, 'package.json');
        if (!(0, node_fs_1.existsSync)(packagePath)) {
            logger_js_1.logger.verbose(`No package.json in ${pluginPath}, skipping`);
            continue;
        }
        try {
            // Load plugin
            const mainPath = (0, node_path_1.join)(pluginPath, 'dist', 'index.js');
            if (!(0, node_fs_1.existsSync)(mainPath)) {
                logger_js_1.logger.warn(`Plugin ${entry.name} has no dist/index.js, skipping`);
                continue;
            }
            const pluginModule = await Promise.resolve(`${(0, node_url_1.pathToFileURL)(mainPath).href}`).then(s => __importStar(require(s)));
            const plugin = pluginModule.default ?? pluginModule;
            // Validate plugin
            if (!plugin.name || !plugin.version) {
                logger_js_1.logger.warn(`Plugin in ${pluginPath} is missing name or version, skipping`);
                continue;
            }
            // Initialize plugin
            if (plugin.init) {
                await plugin.init(context);
            }
            // Register plugin
            exports.pluginRegistry.register(plugin);
        }
        catch (err) {
            logger_js_1.logger.error(`Failed to load plugin from ${pluginPath}`, {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}
/**
 * Get default plugin directories
 */
function getPluginDirectories() {
    const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return [
        // User plugins
        (0, node_path_1.join)(homeDir, '.config', 'summit-admin-cli', 'plugins'),
        // System plugins (for enterprise deployments)
        '/usr/share/summit-admin-cli/plugins',
        // Local plugins (for development)
        (0, node_path_1.join)(process.cwd(), '.summit-plugins'),
    ].filter(Boolean);
}
/**
 * Create plugin context
 */
function createPluginContext() {
    const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return {
        cliVersion: '1.0.0',
        configDir: (0, node_path_1.join)(homeDir, '.config', 'summit-admin-cli'),
        logger: logger_js_1.logger,
    };
}
