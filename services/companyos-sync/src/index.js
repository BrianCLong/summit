"use strict";
/**
 * CompanyOS User and Role Sync Service
 * @module @intelgraph/companyos-sync
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyncService = createSyncService;
__exportStar(require("./types.js"), exports);
__exportStar(require("./sync-service.js"), exports);
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const sync_service_js_1 = require("./sync-service.js");
const logger = (0, pino_1.default)({ name: 'companyos-sync' });
/**
 * Create and initialize a CompanyOS Sync Service instance
 */
async function createSyncService(options) {
    const postgres = new pg_1.Pool({
        connectionString: options?.postgresUrl || process.env.DATABASE_URL,
    });
    const redis = new ioredis_1.default(options?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    const service = new sync_service_js_1.CompanyOSSyncService({
        postgres,
        redis,
        logger,
    });
    await service.initialize();
    return service;
}
// Standalone server entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT || 3100);
    (async () => {
        try {
            const service = await createSyncService();
            logger.info({ port }, 'CompanyOS Sync Service started');
            // Graceful shutdown
            process.on('SIGTERM', async () => {
                logger.info('Received SIGTERM, shutting down...');
                await service.shutdown();
                process.exit(0);
            });
            process.on('SIGINT', async () => {
                logger.info('Received SIGINT, shutting down...');
                await service.shutdown();
                process.exit(0);
            });
        }
        catch (error) {
            logger.error({ error }, 'Failed to start service');
            process.exit(1);
        }
    })();
}
