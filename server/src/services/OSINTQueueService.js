"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.osintQueue = void 0;
exports.startOSINTWorkers = startOSINTWorkers;
exports.enqueueOSINT = enqueueOSINT;
const bullmq_1 = require("bullmq");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const VeracityScoringService_js_1 = require("./VeracityScoringService.js");
const index_js_1 = __importDefault(require("../config/index.js"));
const ExternalAPIService_js_1 = require("./ExternalAPIService.js");
const OSINTService_js_1 = require("./OSINTService.js");
const connection = {
    host: index_js_1.default.redis?.host || 'localhost',
    port: index_js_1.default.redis?.port || 6379,
    password: index_js_1.default.redis?.password,
    db: index_js_1.default.redis?.db || 0,
};
exports.osintQueue = new bullmq_1.Queue('osint-ingest', { connection });
function startOSINTWorkers() {
    const worker = new bullmq_1.Worker('osint-ingest', async (job) => {
        const { type, targetId, tenantId, params } = job.data;
        logger_js_1.default.info(`Processing OSINT job ${job.id}: ${type} for ${targetId}`);
        const extApi = new ExternalAPIService_js_1.ExternalAPIService(logger_js_1.default);
        const osintService = new OSINTService_js_1.OSINTService();
        const veracityService = new VeracityScoringService_js_1.VeracityScoringService();
        try {
            if (type === 'wikipedia' || type === 'comprehensive_scan') {
                // 1. Enrich from Wikipedia
                let title = targetId;
                if (targetId.includes(':')) {
                    title = targetId.split(':')[1];
                }
                try {
                    // Basic fetch from Wikipedia if it looks like a wiki entity or we treat the ID as a title
                    // If targetId is a UUID, this might fail unless we look up the label first.
                    // For this MVP, we assume targetId is usable or we just try.
                    await osintService.enrichFromWikipedia({ entityId: targetId, title });
                }
                catch (e) {
                    logger_js_1.default.warn(`Wikipedia enrichment failed for ${targetId}`, e);
                }
            }
            // 2. Score Veracity
            await veracityService.scoreEntity(targetId);
            logger_js_1.default.info(`OSINT job ${job.id} completed.`);
        }
        catch (err) {
            logger_js_1.default.error(`OSINT job ${job.id} failed`, err);
            throw err;
        }
    }, { connection });
    worker.on('failed', (job, err) => {
        logger_js_1.default.error(`OSINT job ${job?.id} failed with ${err.message}`);
    });
    return worker;
}
async function enqueueOSINT(type, targetId, options = {}) {
    const job = await exports.osintQueue.add('ingest', { type, targetId, ...options }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    return job.id;
}
