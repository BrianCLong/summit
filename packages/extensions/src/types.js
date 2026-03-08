"use strict";
// @ts-nocheck
/**
 * Summit Extension Manifest Types
 *
 * Defines the structure for extension manifests, capabilities, and permissions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionManifestSchema = exports.ConfigSchemaDefinition = exports.EntrypointSchema = exports.ExtensionPermission = exports.ExtensionCapability = exports.ExtensionType = void 0;
const zod_1 = require("zod");
/**
 * Extension types supported by Summit
 */
var ExtensionType;
(function (ExtensionType) {
    ExtensionType["CONNECTOR"] = "connector";
    ExtensionType["WIDGET"] = "widget";
    ExtensionType["COMMAND"] = "command";
    ExtensionType["TOOL"] = "tool";
    ExtensionType["ANALYZER"] = "analyzer";
    ExtensionType["INTEGRATION"] = "integration";
})(ExtensionType || (exports.ExtensionType = ExtensionType = {}));
/**
 * Capabilities that extensions can expose
 */
var ExtensionCapability;
(function (ExtensionCapability) {
    // Data capabilities
    ExtensionCapability["DATA_INGESTION"] = "data.ingestion";
    ExtensionCapability["DATA_EXPORT"] = "data.export";
    ExtensionCapability["DATA_TRANSFORM"] = "data.transform";
    // UI capabilities
    ExtensionCapability["UI_WIDGET"] = "ui.widget";
    ExtensionCapability["UI_COMMAND"] = "ui.command";
    ExtensionCapability["UI_PANEL"] = "ui.panel";
    // Copilot capabilities
    ExtensionCapability["COPILOT_TOOL"] = "copilot.tool";
    ExtensionCapability["COPILOT_SKILL"] = "copilot.skill";
    // Analysis capabilities
    ExtensionCapability["ANALYTICS"] = "analytics";
    ExtensionCapability["ENRICHMENT"] = "enrichment";
    // Integration capabilities
    ExtensionCapability["API_PROVIDER"] = "api.provider";
    ExtensionCapability["WEBHOOK"] = "webhook";
})(ExtensionCapability || (exports.ExtensionCapability = ExtensionCapability = {}));
/**
 * Permissions that extensions can request
 */
var ExtensionPermission;
(function (ExtensionPermission) {
    // Data permissions
    ExtensionPermission["READ_ENTITIES"] = "entities:read";
    ExtensionPermission["WRITE_ENTITIES"] = "entities:write";
    ExtensionPermission["READ_RELATIONSHIPS"] = "relationships:read";
    ExtensionPermission["WRITE_RELATIONSHIPS"] = "relationships:write";
    ExtensionPermission["READ_INVESTIGATIONS"] = "investigations:read";
    ExtensionPermission["WRITE_INVESTIGATIONS"] = "investigations:write";
    // System permissions
    ExtensionPermission["NETWORK_ACCESS"] = "network:access";
    ExtensionPermission["FILE_SYSTEM_READ"] = "fs:read";
    ExtensionPermission["FILE_SYSTEM_WRITE"] = "fs:write";
    ExtensionPermission["EXECUTE_COMMANDS"] = "commands:execute";
    // API permissions
    ExtensionPermission["API_ACCESS"] = "api:access";
    ExtensionPermission["WEBHOOK_REGISTER"] = "webhook:register";
    // User permissions
    ExtensionPermission["USER_DATA_ACCESS"] = "user:data";
})(ExtensionPermission || (exports.ExtensionPermission = ExtensionPermission = {}));
/**
 * Extension entrypoint definition
 */
exports.EntrypointSchema = zod_1.z.object({
    type: zod_1.z.enum(['function', 'class', 'http', 'cli']),
    path: zod_1.z.string().describe('Relative path to the entrypoint module'),
    export: zod_1.z.string().optional().describe('Named export (default if not specified)'),
    handler: zod_1.z.string().optional().describe('Function/method name to invoke'),
});
/**
 * Extension configuration schema
 */
exports.ConfigSchemaDefinition = zod_1.z.object({
    type: zod_1.z.enum(['object', 'string', 'number', 'boolean', 'array']),
    properties: zod_1.z.record(zod_1.z.any()).optional(),
    required: zod_1.z.array(zod_1.z.string()).optional(),
    default: zod_1.z.any().optional(),
    description: zod_1.z.string().optional(),
});
/**
 * Extension manifest schema
 */
exports.ExtensionManifestSchema = zod_1.z.object({
    // Identity
    name: zod_1.z.string()
        .min(1)
        .regex(/^[a-z0-9-]+$/)
        .describe('Unique extension identifier (kebab-case)'),
    displayName: zod_1.z.string()
        .min(1)
        .describe('Human-readable name'),
    version: zod_1.z.string()
        .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/)
        .describe('Semantic version (e.g., 1.0.0)'),
    description: zod_1.z.string()
        .min(1)
        .describe('Brief description of the extension'),
    author: zod_1.z.string()
        .optional()
        .describe('Extension author'),
    license: zod_1.z.string()
        .optional()
        .describe('License identifier (e.g., MIT, Apache-2.0)'),
    // Type and capabilities
    type: zod_1.z.nativeEnum(ExtensionType)
        .describe('Primary extension type'),
    capabilities: zod_1.z.array(zod_1.z.nativeEnum(ExtensionCapability))
        .min(1)
        .describe('List of capabilities this extension provides'),
    // Permissions
    permissions: zod_1.z.array(zod_1.z.nativeEnum(ExtensionPermission))
        .default([])
        .describe('Permissions required by this extension'),
    // Entrypoints
    entrypoints: zod_1.z.record(exports.EntrypointSchema)
        .describe('Named entrypoints for different contexts'),
    // Configuration
    configSchema: exports.ConfigSchemaDefinition
        .optional()
        .describe('JSON Schema for extension configuration'),
    // Dependencies
    dependencies: zod_1.z.record(zod_1.z.string())
        .optional()
        .describe('NPM package dependencies'),
    peerDependencies: zod_1.z.record(zod_1.z.string())
        .optional()
        .describe('Expected peer dependencies'),
    // Integration points
    copilot: zod_1.z.object({
        tools: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            parameters: zod_1.z.record(zod_1.z.any()),
            entrypoint: zod_1.z.string(),
        })).optional(),
        skills: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            entrypoint: zod_1.z.string(),
        })).optional(),
    }).optional(),
    ui: zod_1.z.object({
        commands: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            title: zod_1.z.string(),
            icon: zod_1.z.string().optional(),
            category: zod_1.z.string().optional(),
            entrypoint: zod_1.z.string(),
        })).optional(),
        widgets: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            title: zod_1.z.string(),
            component: zod_1.z.string(),
            placement: zod_1.z.enum(['dashboard', 'sidebar', 'panel']).optional(),
        })).optional(),
    }).optional(),
    cli: zod_1.z.object({
        commands: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            entrypoint: zod_1.z.string(),
            arguments: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                description: zod_1.z.string(),
                required: zod_1.z.boolean().optional(),
                type: zod_1.z.enum(['string', 'number', 'boolean']).optional(),
            })).optional(),
            options: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                alias: zod_1.z.string().optional(),
                description: zod_1.z.string(),
                type: zod_1.z.enum(['string', 'number', 'boolean']).optional(),
                default: zod_1.z.any().optional(),
            })).optional(),
        })).optional(),
    }).optional(),
    // Metadata
    homepage: zod_1.z.string().url().optional(),
    repository: zod_1.z.string().url().optional(),
    keywords: zod_1.z.array(zod_1.z.string()).optional(),
    // Summit-specific
    summit: zod_1.z.object({
        minVersion: zod_1.z.string().optional(),
        maxVersion: zod_1.z.string().optional(),
        experimental: zod_1.z.boolean().optional(),
    }).optional(),
});
