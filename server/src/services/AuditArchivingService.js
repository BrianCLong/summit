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
exports.auditArchivingService = exports.AuditArchivingService = void 0;
const zlib_1 = require("zlib");
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const database_js_1 = require("../config/database.js");
class AuditArchivingService {
    static instance;
    db;
    archiveRoot;
    constructor() {
        this.db = (0, database_js_1.getPostgresPool)();
        this.archiveRoot = path_1.default.join(process.cwd(), 'archive/audit');
        (0, fs_1.mkdirSync)(this.archiveRoot, { recursive: true });
    }
    static getInstance() {
        if (!AuditArchivingService.instance) {
            AuditArchivingService.instance = new AuditArchivingService();
        }
        return AuditArchivingService.instance;
    }
    /**
     * Extracts and archives audit events within the specified date range.
     */
    async archiveRange(startDate, endDate, tier) {
        logger_js_1.default.info(`Starting audit archival for range ${startDate.toISOString()} - ${endDate.toISOString()} (Tier: ${tier})`);
        const bundleId = `audit_${tier.toLowerCase()}_${startDate.getTime()}_${endDate.getTime()}`;
        const bundlePath = path_1.default.join(this.archiveRoot, `${bundleId}.json.gz`);
        // 1. Fetch records from DB
        const query = `
            SELECT * FROM audit_events 
            WHERE timestamp >= $1 AND timestamp < $2
        `;
        const result = await this.db.query(query, [startDate, endDate]);
        const recordCount = result.rowCount ?? 0;
        if (recordCount === 0) {
            logger_js_1.default.info('No records found for archival in this range.');
            return null;
        }
        // 2. Compress and write to "Cold Storage" (Mocking file-based archival)
        const jsonData = JSON.stringify(result.rows);
        const writeStream = (0, fs_1.createWriteStream)(bundlePath);
        const gzip = (0, zlib_1.createGzip)();
        const readable = stream_1.Readable.from([jsonData]);
        await (0, promises_1.pipeline)(readable, gzip, writeStream);
        const stats = await Promise.resolve().then(() => __importStar(require('fs/promises'))).then(fs => fs.stat(bundlePath));
        logger_js_1.default.info(`Archived ${recordCount} records to ${bundlePath} (${(stats.size / 1024).toFixed(2)} KB)`);
        return {
            tier,
            bundlePath,
            recordCount,
            compressedSize: stats.size
        };
    }
}
exports.AuditArchivingService = AuditArchivingService;
exports.auditArchivingService = AuditArchivingService.getInstance();
