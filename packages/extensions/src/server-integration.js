"use strict";
/**
 * Server Integration
 *
 * Example of how to integrate the extension system into a server application.
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
exports.initializeExtensions = initializeExtensions;
exports.setupExtensionRoutes = setupExtensionRoutes;
const path = __importStar(require("path"));
const manager_js_1 = require("./manager.js");
/**
 * Initialize the extension system for a server application
 */
async function initializeExtensions(options) {
    const manager = new manager_js_1.ExtensionManager({
        extensionDirs: options.extensionDirs || [
            path.join(process.cwd(), 'extensions'),
            path.join(process.cwd(), 'extensions/examples'),
        ],
        api: options.api,
        enablePolicy: process.env.OPA_URL !== undefined,
        opaUrl: process.env.OPA_URL,
    });
    await manager.initialize();
    return manager;
}
/**
 * Example: Integrate with Express server
 */
function setupExtensionRoutes(app, manager) {
    // List extensions
    app.get('/api/extensions', (req, res) => {
        const registry = manager.getRegistry();
        const extensions = registry.getAll().map((ext) => ({
            name: ext.manifest.name,
            displayName: ext.manifest.displayName,
            version: ext.manifest.version,
            description: ext.manifest.description,
            type: ext.manifest.type,
            capabilities: ext.manifest.capabilities,
            loaded: ext.loaded,
            enabled: ext.enabled,
        }));
        res.json(extensions);
    });
    // Get extension details
    app.get('/api/extensions/:name', (req, res) => {
        const registry = manager.getRegistry();
        const ext = registry.get(req.params.name);
        if (!ext) {
            return res.status(404).json({ error: 'Extension not found' });
        }
        res.json({
            manifest: ext.manifest,
            loaded: ext.loaded,
            enabled: ext.enabled,
            error: ext.error,
        });
    });
    // Execute copilot tool
    app.post('/api/extensions/copilot/tools/:name', async (req, res) => {
        try {
            const result = await manager.copilot.executeTool(req.params.name, req.body);
            res.json({ result });
        }
        catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    });
    // Execute UI command
    app.post('/api/extensions/ui/commands/:id', async (req, res) => {
        try {
            const result = await manager.commandPalette.executeCommand(req.params.id);
            res.json({ result });
        }
        catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    });
    // Get UI widgets
    app.get('/api/extensions/ui/widgets', (req, res) => {
        const widgets = manager.commandPalette.getWidgets();
        res.json(widgets);
    });
    // Reload extensions
    app.post('/api/extensions/reload', async (req, res) => {
        try {
            await manager.reload();
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    });
    // Extension statistics
    app.get('/api/extensions/stats', (req, res) => {
        const stats = manager.getStats();
        res.json(stats);
    });
}
