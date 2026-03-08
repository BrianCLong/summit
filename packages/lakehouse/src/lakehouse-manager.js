"use strict";
/**
 * Lakehouse Manager
 * Central management for data lakehouse operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LakehouseManager = void 0;
const types_js_1 = require("./types.js");
const delta_lake_js_1 = require("./table-formats/delta-lake.js");
const iceberg_js_1 = require("./table-formats/iceberg.js");
const hudi_js_1 = require("./table-formats/hudi.js");
const catalog_js_1 = require("./catalog.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'lakehouse-manager' });
class LakehouseManager {
    tables;
    catalog;
    constructor() {
        this.tables = new Map();
        this.catalog = new catalog_js_1.LakehouseCatalog();
        logger.info('Lakehouse manager initialized');
    }
    async createTable(config) {
        if (this.tables.has(config.name)) {
            throw new Error(`Table ${config.name} already exists`);
        }
        let table;
        switch (config.format) {
            case types_js_1.TableFormat.DELTA_LAKE:
                table = new delta_lake_js_1.DeltaLakeTable(config);
                break;
            case types_js_1.TableFormat.ICEBERG:
                table = new iceberg_js_1.IcebergTable(config);
                break;
            case types_js_1.TableFormat.HUDI:
                table = new hudi_js_1.HudiTable(config, hudi_js_1.HudiTableType.COPY_ON_WRITE);
                break;
            default:
                throw new Error(`Unsupported table format: ${config.format}`);
        }
        this.tables.set(config.name, table);
        await this.catalog.registerTable(table.getMetadata());
        logger.info({ table: config.name, format: config.format }, 'Table created');
        return table;
    }
    getTable(name) {
        return this.tables.get(name);
    }
    async dropTable(name) {
        const table = this.tables.get(name);
        if (!table) {
            throw new Error(`Table ${name} not found`);
        }
        this.tables.delete(name);
        await this.catalog.unregisterTable(name);
        logger.info({ table: name }, 'Table dropped');
    }
    async listTables() {
        return Array.from(this.tables.keys());
    }
    async getTableMetadata(name) {
        const table = this.tables.get(name);
        if (!table) {
            throw new Error(`Table ${name} not found`);
        }
        return table.getMetadata();
    }
    getCatalog() {
        return this.catalog;
    }
    async compactAllTables() {
        logger.info('Starting compaction for all tables');
        for (const [name, table] of this.tables) {
            try {
                const result = await table.compact();
                logger.info({ table: name, result }, 'Table compacted');
            }
            catch (error) {
                logger.error({ error, table: name }, 'Failed to compact table');
            }
        }
    }
    async vacuumAllTables(olderThan) {
        logger.info({ olderThan }, 'Starting vacuum for all tables');
        for (const [name, table] of this.tables) {
            try {
                const removed = await table.vacuum(olderThan);
                logger.info({ table: name, removed }, 'Table vacuumed');
            }
            catch (error) {
                logger.error({ error, table: name }, 'Failed to vacuum table');
            }
        }
    }
}
exports.LakehouseManager = LakehouseManager;
