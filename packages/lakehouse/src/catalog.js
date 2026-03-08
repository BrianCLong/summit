"use strict";
/**
 * Lakehouse Catalog
 * Metadata management for lakehouse tables
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LakehouseCatalog = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'lakehouse-catalog' });
class LakehouseCatalog {
    entries;
    constructor() {
        this.entries = new Map();
        logger.info('Lakehouse catalog initialized');
    }
    async registerTable(metadata) {
        const entry = {
            metadata,
            registeredAt: new Date(),
            lastAccessed: new Date()
        };
        this.entries.set(metadata.name, entry);
        logger.info({ table: metadata.name }, 'Table registered in catalog');
    }
    async unregisterTable(name) {
        this.entries.delete(name);
        logger.info({ table: name }, 'Table unregistered from catalog');
    }
    async getTableMetadata(name) {
        const entry = this.entries.get(name);
        if (entry) {
            entry.lastAccessed = new Date();
            return entry.metadata;
        }
        return undefined;
    }
    async listTables() {
        return Array.from(this.entries.values()).map(e => e.metadata);
    }
    async searchTables(pattern) {
        const regex = new RegExp(pattern, 'i');
        return Array.from(this.entries.values())
            .filter(e => regex.test(e.metadata.name))
            .map(e => e.metadata);
    }
    async updateTableMetadata(name, updates) {
        const entry = this.entries.get(name);
        if (!entry) {
            throw new Error(`Table ${name} not found in catalog`);
        }
        Object.assign(entry.metadata, updates);
        entry.metadata.updatedAt = new Date();
        logger.info({ table: name }, 'Table metadata updated');
    }
    async getStatistics() {
        return {
            totalTables: this.entries.size,
            tablesByFormat: this.getTablesByFormat(),
            totalSize: this.getTotalSize()
        };
    }
    getTablesByFormat() {
        const counts = {};
        for (const entry of this.entries.values()) {
            const format = entry.metadata.format;
            counts[format] = (counts[format] || 0) + 1;
        }
        return counts;
    }
    getTotalSize() {
        // Would calculate total size from table metadata
        return 0;
    }
}
exports.LakehouseCatalog = LakehouseCatalog;
