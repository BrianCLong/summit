"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRetention = enforceRetention;
exports.scheduleRetention = scheduleRetention;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const stream_1 = require("stream");
const zlib_1 = __importDefault(require("zlib"));
const pump = (0, util_1.promisify)(stream_1.pipeline);
async function compressOldLogs(directory, compressAfterDays, logger) {
    const files = await fs_1.default.promises.readdir(directory);
    const now = Date.now();
    await Promise.all(files
        .filter((file) => file.endsWith('.log'))
        .map(async (file) => {
        const fullPath = path_1.default.join(directory, file);
        const stats = await fs_1.default.promises.stat(fullPath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays < compressAfterDays)
            return;
        const gzPath = `${fullPath}.gz`;
        if (fs_1.default.existsSync(gzPath))
            return;
        await pump(fs_1.default.createReadStream(fullPath), zlib_1.default.createGzip(), fs_1.default.createWriteStream(gzPath));
        await fs_1.default.promises.unlink(fullPath);
        logger.info({ file }, 'Compressed old log file');
    }));
}
async function deleteExpiredLogs(directory, retentionDays, logger) {
    const files = await fs_1.default.promises.readdir(directory);
    const now = Date.now();
    await Promise.all(files
        .filter((file) => file.endsWith('.gz') || file.endsWith('.log'))
        .map(async (file) => {
        const fullPath = path_1.default.join(directory, file);
        const stats = await fs_1.default.promises.stat(fullPath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays > retentionDays) {
            await fs_1.default.promises.unlink(fullPath);
            logger.warn({ file }, 'Removed log due to retention policy');
        }
    }));
}
async function enforceSizeLimit(directory, maxTotalSizeMb, logger) {
    const files = await fs_1.default.promises.readdir(directory);
    const entries = await Promise.all(files
        .filter((file) => file.endsWith('.gz') || file.endsWith('.log'))
        .map(async (file) => ({
        file,
        fullPath: path_1.default.join(directory, file),
        stats: await fs_1.default.promises.stat(path_1.default.join(directory, file)),
    })));
    let totalBytes = entries.reduce((acc, entry) => acc + entry.stats.size, 0);
    const maxBytes = maxTotalSizeMb * 1024 * 1024;
    if (totalBytes <= maxBytes)
        return;
    // delete oldest until under limit
    const sorted = entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
    for (const entry of sorted) {
        if (totalBytes <= maxBytes)
            break;
        await fs_1.default.promises.unlink(entry.fullPath);
        totalBytes -= entry.stats.size;
        logger.warn({ file: entry.file }, 'Removed log to enforce size cap');
    }
}
async function enforceRetention(policy, logger) {
    await fs_1.default.promises.mkdir(policy.directory, { recursive: true });
    await compressOldLogs(policy.directory, policy.compressAfterDays, logger);
    await deleteExpiredLogs(policy.directory, policy.retentionDays, logger);
    await enforceSizeLimit(policy.directory, policy.maxTotalSizeMb, logger);
}
function scheduleRetention(policy, logger) {
    const intervalMinutes = Number(process.env.LOG_RETENTION_CHECK_MINUTES ?? '30');
    enforceRetention(policy, logger).catch((error) => logger.error({ error }, 'Failed to enforce retention'));
    const handle = setInterval(() => {
        enforceRetention(policy, logger).catch((error) => logger.error({ error }, 'Failed to enforce retention'));
    }, intervalMinutes * 60 * 1000);
    // allow process exit in tests and short-lived commands
    if (typeof handle.unref === 'function') {
        handle.unref();
    }
    return () => clearInterval(handle);
}
