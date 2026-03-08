"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackupScheduler = startBackupScheduler;
const BackupService_js_1 = require("../services/BackupService.js");
const FlagService_js_1 = require("../services/FlagService.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'BackupScheduler' });
const BACKUP_INTERVAL_MS = parseInt(process.env.BACKUP_INTERVAL_MS || '86400000', 10); // Default 24h
function startBackupScheduler() {
    logger.info(`Starting backup scheduler with interval ${BACKUP_INTERVAL_MS}ms`);
    // Initial backup on startup (optional, maybe too heavy? let's stick to interval)
    // setTimeout(() => runBackup(), 10000);
    setInterval(() => {
        runBackup();
    }, BACKUP_INTERVAL_MS);
}
async function runBackup() {
    if (FlagService_js_1.flagService.getFlag('DISABLE_BACKUPS')) {
        logger.warn('Skipping scheduled backup due to kill switch DISABLE_BACKUPS');
        return;
    }
    try {
        logger.info('Triggering scheduled backup...');
        await BackupService_js_1.BackupService.getInstance().performFullBackup();
        logger.info('Scheduled backup finished successfully.');
    }
    catch (error) {
        logger.error('Scheduled backup failed', error);
    }
}
