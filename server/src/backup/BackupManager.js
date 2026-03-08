"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupManager = void 0;
const BackupService_js_1 = require("./BackupService.js");
const logger_js_1 = require("../config/logger.js");
const node_cron_1 = __importDefault(require("node-cron"));
class BackupManager {
    backupService;
    schedule; // Cron expression
    constructor(schedule = '0 2 * * *') {
        this.backupService = new BackupService_js_1.BackupService();
        this.schedule = schedule;
    }
    startScheduler() {
        logger_js_1.logger.info(`Starting backup scheduler with schedule: ${this.schedule}`);
        node_cron_1.default.schedule(this.schedule, async () => {
            logger_js_1.logger.info('Running scheduled backups...');
            try {
                const results = await this.backupService.runAllBackups();
                logger_js_1.logger.info({ results }, 'Scheduled backups completed');
            }
            catch (error) {
                logger_js_1.logger.error('Scheduled backup execution failed', error);
            }
        });
        // Hourly Redis Backup (for fast recovery)
        node_cron_1.default.schedule('0 * * * *', async () => {
            logger_js_1.logger.info('Running hourly Redis backup...');
            try {
                await this.backupService.backupRedis({ uploadToS3: false }); // Local only for speed
            }
            catch (error) {
                logger_js_1.logger.error('Hourly Redis backup failed', error);
            }
        });
    }
    async triggerImmediateBackup() {
        logger_js_1.logger.info('Triggering immediate backup...');
        return await this.backupService.runAllBackups();
    }
}
exports.BackupManager = BackupManager;
