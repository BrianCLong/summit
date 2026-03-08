"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManifestValidationError = void 0;
class PluginManifestValidationError extends Error {
    code = 'PLUGIN_MANIFEST_INVALID';
    issues;
    constructor(error) {
        super('Plugin manifest failed validation');
        this.name = 'PluginManifestValidationError';
        this.issues = error.issues;
    }
}
exports.PluginManifestValidationError = PluginManifestValidationError;
