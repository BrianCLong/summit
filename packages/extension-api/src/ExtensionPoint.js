"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionPointRegistry = void 0;
/**
 * Extension point registry
 */
class ExtensionPointRegistry {
    extensions = new Map();
    /**
     * Register an extension
     */
    register(extension) {
        const { type } = extension;
        const extensions = this.extensions.get(type) || [];
        extensions.push(extension);
        this.extensions.set(type, extensions);
    }
    /**
     * Unregister an extension
     */
    unregister(extensionId) {
        for (const [type, extensions] of this.extensions.entries()) {
            const filtered = extensions.filter(ext => ext.id !== extensionId);
            this.extensions.set(type, filtered);
        }
    }
    /**
     * Get all extensions of a type
     */
    getExtensions(type) {
        return this.extensions.get(type) || [];
    }
    /**
     * Execute all extensions of a type
     */
    async executeAll(type, input) {
        const extensions = this.getExtensions(type);
        const results = await Promise.all(extensions.map(ext => ext.execute(input)));
        return results;
    }
    /**
     * Execute extensions in pipeline (output of one becomes input of next)
     */
    async executePipeline(type, initialInput) {
        const extensions = this.getExtensions(type);
        let result = initialInput;
        for (const extension of extensions) {
            result = await extension.execute(result);
        }
        return result;
    }
}
exports.ExtensionPointRegistry = ExtensionPointRegistry;
