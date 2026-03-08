"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEvidenceIntegrityJob = startEvidenceIntegrityJob;
const cron = __importStar(require("node-cron"));
const pino_1 = __importDefault(require("pino"));
const integrity_service_js_1 = require("../evidence/integrity-service.js");
const logger = pino_1.default({ name: 'EvidenceIntegrityJob' });
const cronExpression = process.env.EVIDENCE_INTEGRITY_CRON || '0 2 * * *';
const chunkSize = Number(process.env.EVIDENCE_INTEGRITY_CHUNK || '50');
const rateLimitPerSecond = Number(process.env.EVIDENCE_INTEGRITY_RPS || '5');
function startEvidenceIntegrityJob() {
    if (process.env.EVIDENCE_INTEGRITY !== 'true') {
        logger.info('Evidence integrity job disabled via EVIDENCE_INTEGRITY flag');
        return;
    }
    cron.schedule(cronExpression, async () => {
        try {
            const result = await integrity_service_js_1.evidenceIntegrityService.verifyAll({
                chunkSize,
                rateLimitPerSecond,
                emitIncidents: process.env.EVIDENCE_INTEGRITY_INCIDENTS === 'true',
            });
            logger.info({ cronExpression, ...result }, 'Evidence integrity verification completed');
        }
        catch (error) {
            logger.error({ err: error }, 'Evidence integrity verification job failed');
        }
    });
    logger.info({ cronExpression }, 'Evidence integrity job scheduled');
}
