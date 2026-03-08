"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationRegistry = void 0;
/**
 * Data Classification Registry
 * Maps entity paths to classification rules.
 */
const types_js_1 = require("./types.js");
class ClassificationRegistry {
    static instance;
    registry = new Map();
    constructor() { }
    static getInstance() {
        if (!ClassificationRegistry.instance) {
            ClassificationRegistry.instance = new ClassificationRegistry();
        }
        return ClassificationRegistry.instance;
    }
    /**
     * Register a classification for a specific path
     * @param path entity.field path (e.g. "User.email"). Case-sensitive.
     * @param classification DataClassification
     * @param severity DataSeverity
     */
    register(path, classification, severity = types_js_1.DataSeverity.MEDIUM) {
        this.registry.set(path, {
            id: `reg-${path}`,
            classification,
            severity,
            description: `Manual registration for ${path}`
        });
    }
    /**
     * Get classification for a path
     * @param path entity.field path. Case-sensitive.
     */
    get(path) {
        return this.registry.get(path);
    }
    /**
     * Clear registry (for testing)
     */
    clear() {
        this.registry.clear();
    }
    /**
     * Get all registered paths
     * Returns a new Map to prevent mutation of internal state.
     */
    getAll() {
        return new Map(this.registry);
    }
}
exports.ClassificationRegistry = ClassificationRegistry;
