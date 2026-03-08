"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentProcessor = void 0;
const intents_js_1 = require("../../federation/intents.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const intentProcessor = async (job) => {
    const intent = job.data;
    logger_js_1.default.info({ intentId: intent.id, jobId: job.id }, 'Processing federation intent');
    try {
        const service = intents_js_1.IntentService.getInstance();
        await service.applyIntent(intent);
        logger_js_1.default.info({ intentId: intent.id }, 'Intent applied successfully');
    }
    catch (error) {
        logger_js_1.default.error({ intentId: intent.id, error: error.message }, 'Failed to apply intent');
        // Explicitly fail the job so BullMQ handles retries/dead-lettering
        // We append the error reason to the job status if possible (BullMQ supports return values or error throwing)
        throw new Error(`INTENT_FAILED: ${error.message}`);
    }
};
exports.intentProcessor = intentProcessor;
