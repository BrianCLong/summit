"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordDefinitionRegistry = void 0;
class RecordDefinitionRegistry {
    definitions = new Map();
    register(definition) {
        this.definitions.set(definition.type, definition);
    }
    get(recordType) {
        return this.definitions.get(recordType);
    }
    validate(recordType, payload) {
        const definition = this.get(recordType);
        if (!definition) {
            throw new Error(`Record definition ${recordType} not registered`);
        }
        definition.schema.parse(payload);
    }
    list() {
        return Array.from(this.definitions.values());
    }
}
exports.RecordDefinitionRegistry = RecordDefinitionRegistry;
