"use strict";
/**
 * ETL/ELT Pipeline Manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineManager = void 0;
const bulk_loader_1 = require("./loaders/bulk-loader");
const incremental_loader_1 = require("./loaders/incremental-loader");
class PipelineManager {
    bulkLoader;
    incrementalLoader;
    constructor(pool) {
        this.bulkLoader = new bulk_loader_1.BulkLoader(pool);
        this.incrementalLoader = new incremental_loader_1.IncrementalLoader(pool);
    }
    async runPipeline(config) {
        // Simplified pipeline execution
        console.log(`Running pipeline: ${config.name}`);
    }
}
exports.PipelineManager = PipelineManager;
