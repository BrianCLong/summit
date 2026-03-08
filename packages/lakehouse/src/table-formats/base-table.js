"use strict";
/**
 * Base Table Format
 * Abstract base class for all table format implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTable = void 0;
class BaseTable {
    config;
    metadata;
    constructor(config) {
        this.config = config;
        this.metadata = this.initializeMetadata();
    }
    initializeMetadata() {
        return {
            id: `${this.config.name}-${Date.now()}`,
            name: this.config.name,
            format: this.config.format,
            schema: this.config.schema,
            location: this.config.location,
            properties: this.config.properties || {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    getMetadata() {
        return this.metadata;
    }
    getName() {
        return this.config.name;
    }
    getFormat() {
        return this.config.format;
    }
    getLocation() {
        return this.config.location;
    }
}
exports.BaseTable = BaseTable;
