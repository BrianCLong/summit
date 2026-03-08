"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobStatus = exports.runRetention = void 0;
const RetentionService_js_1 = require("./RetentionService.js");
const path_1 = __importDefault(require("path"));
// Config
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path_1.default.join(process.cwd(), 'logs', 'telemetry');
const service = new RetentionService_js_1.RetentionService(LOG_DIR);
const runRetention = (req, res) => {
    try {
        const { days = 90 } = req.body;
        const deletedCount = service.runRetentionPolicy(Number(days));
        // Log the action for audit (mocked here, in real app verify against dictionary)
        res.json({
            status: 'success',
            deletedFiles: deletedCount,
            policyDays: days,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.runRetention = runRetention;
const getJobStatus = (req, res) => {
    // In a real system, we'd track job IDs.
    // For MVP, just return static status or last run info if we had state.
    res.json({ status: 'idle', lastRun: 'never' });
};
exports.getJobStatus = getJobStatus;
