"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logRetention_js_1 = require("../logRetention.js");
(0, globals_1.describe)('log retention', () => {
    const logger = pino_1.default({ level: 'silent' });
    let tempDir;
    const createFile = (name, sizeBytes, daysAgo) => {
        const fullPath = path_1.default.join(tempDir, name);
        fs_1.default.writeFileSync(fullPath, 'x'.repeat(sizeBytes));
        const time = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
        fs_1.default.utimesSync(fullPath, time / 1000, time / 1000);
        return fullPath;
    };
    (0, globals_1.beforeEach)(() => {
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'logs-'));
    });
    (0, globals_1.afterEach)(async () => {
        await fs_1.default.promises.rm(tempDir, { recursive: true, force: true });
    });
    (0, globals_1.it)('compresses, deletes expired logs, and enforces size cap', async () => {
        createFile('expired.log', 128, 5);
        createFile('compress.log', 256, 2);
        createFile('keep.log', 700_000, 0);
        createFile('big.log', 700_000, 3);
        await (0, logRetention_js_1.enforceRetention)({
            directory: tempDir,
            retentionDays: 1,
            compressAfterDays: 1,
            maxTotalSizeMb: 1,
        }, logger);
        const files = await fs_1.default.promises.readdir(tempDir);
        // expired.log should be removed due to age
        (0, globals_1.expect)(files).not.toContain('expired.log');
        // compress.log should be gzipped and original removed
        (0, globals_1.expect)(files).toContain('compress.log.gz');
        (0, globals_1.expect)(files).not.toContain('compress.log');
        // size enforcement should remove the oldest large file to get under the cap
        (0, globals_1.expect)(files).not.toContain('big.log');
        (0, globals_1.expect)(files).toContain('keep.log');
    });
});
