"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coldStorageService = exports.ColdStorageService = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ColdStorageService {
    s3Config = null;
    constructor() {
        if (process.env.S3_COLD_STORAGE_BUCKET) {
            this.s3Config = {
                bucket: process.env.S3_COLD_STORAGE_BUCKET,
                region: process.env.S3_REGION || 'us-east-1',
                endpoint: process.env.S3_ENDPOINT,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
        }
    }
    /**
     * Upload a file to Cold Storage (e.g. S3 Glacier)
     */
    async upload(filepath, key, storageClass = 'STANDARD_IA') {
        if (!this.s3Config) {
            logger_js_1.default.warn('Skipping Cold Storage upload: No configuration found.');
            return;
        }
        logger_js_1.default.info(`Uploading ${filepath} to Cold Storage bucket ${this.s3Config.bucket} as ${key} (Class: ${storageClass})...`);
        try {
            if (process.env.USE_AWS_CLI === 'true') {
                await execAsync(`aws s3 cp "${filepath}" "s3://${this.s3Config.bucket}/${key}" --region ${this.s3Config.region} --storage-class ${storageClass}`);
            }
            else {
                // Simulating upload delay
                await new Promise((r) => setTimeout(r, 500));
                logger_js_1.default.info(`Simulated Cold Storage upload complete (Class: ${storageClass}).`);
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to upload to Cold Storage', error);
            throw error;
        }
    }
    /**
     * Archive a table partition
     * 1. Export partition data to file (CSV/Parquet)
     * 2. Upload to Cold Storage
     * 3. (Optional) Drop partition from DB
     */
    async archivePartition(tableName, partitionName, dropAfterArchive = false, storageClass = 'STANDARD_IA') {
        logger_js_1.default.info(`Archiving partition ${partitionName} of table ${tableName} to ${storageClass}...`);
        // In a real implementation, we would use pg_dump or COPY command
        // For now, we'll simulate creating a file
        const exportDir = path_1.default.join(process.env.TEMP_DIR || '/tmp', 'archives');
        await promises_1.default.mkdir(exportDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${partitionName}-${timestamp}.csv.gz`;
        const filepath = path_1.default.join(exportDir, filename);
        try {
            // Simulate export
            await promises_1.default.writeFile(filepath, `Simulated export of ${partitionName}\n`);
            // Upload
            await this.upload(filepath, `archives/${tableName}/${filename}`, storageClass);
            // Cleanup local file
            await promises_1.default.unlink(filepath);
            if (dropAfterArchive) {
                logger_js_1.default.info(`Ready to drop partition ${partitionName} (dry-run)`);
                // await client.query(`DROP TABLE ${partitionName}`);
            }
        }
        catch (error) {
            logger_js_1.default.error(`Failed to archive partition ${partitionName}`, error);
            throw error;
        }
    }
}
exports.ColdStorageService = ColdStorageService;
exports.coldStorageService = new ColdStorageService();
