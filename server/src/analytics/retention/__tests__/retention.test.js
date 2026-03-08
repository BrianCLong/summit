"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RetentionService_js_1 = require("../RetentionService.js");
const TEST_LOG_DIR = path_1.default.join(__dirname, 'test_logs_retention_' + Date.now());
(0, globals_1.describe)('RetentionService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs_1.default.mkdirSync(TEST_LOG_DIR, { recursive: true });
        service = new RetentionService_js_1.RetentionService(TEST_LOG_DIR);
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            try {
                fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            }
            catch (e) { }
        }
    });
    (0, globals_1.it)('should delete old files', () => {
        // Create a file from 10 days ago
        const date = new Date();
        date.setDate(date.getDate() - 10);
        const dateStr = date.toISOString().split('T')[0];
        const oldFile = `telemetry-${dateStr}.jsonl`;
        fs_1.default.writeFileSync(path_1.default.join(TEST_LOG_DIR, oldFile), 'data');
        // Create a file from today
        const todayStr = new Date().toISOString().split('T')[0];
        const newFile = `telemetry-${todayStr}.jsonl`;
        fs_1.default.writeFileSync(path_1.default.join(TEST_LOG_DIR, newFile), 'data');
        // Keep 5 days
        const deleted = service.runRetentionPolicy(5);
        (0, globals_1.expect)(deleted).toBe(1);
        (0, globals_1.expect)(fs_1.default.existsSync(path_1.default.join(TEST_LOG_DIR, oldFile))).toBe(false);
        (0, globals_1.expect)(fs_1.default.existsSync(path_1.default.join(TEST_LOG_DIR, newFile))).toBe(true);
    });
});
