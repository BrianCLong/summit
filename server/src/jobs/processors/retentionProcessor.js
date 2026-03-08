"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retentionProcessor = retentionProcessor;
const retention_js_1 = require("../retention.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'retention-processor' });
async function retentionProcessor(job) {
    const { payload } = job.data;
    const { datasetId, mode } = payload;
    logger.info(`Starting retention purge for dataset ${datasetId} in ${mode} mode.`);
    try {
        await retention_js_1.retentionEngine.purgeDataset(datasetId, mode || 'scheduled');
        logger.info(`Retention purge for dataset ${datasetId} completed.`);
        return { success: true, datasetId };
    }
    catch (error) {
        logger.error(`Retention purge failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}
