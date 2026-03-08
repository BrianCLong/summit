"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class RetentionService {
    logDir;
    constructor(logDir) {
        this.logDir = logDir;
    }
    // Deletes files older than N days
    runRetentionPolicy(daysToKeep) {
        if (!fs_1.default.existsSync(this.logDir))
            return 0;
        const files = fs_1.default.readdirSync(this.logDir).filter((f) => f.startsWith('telemetry-') && f.endsWith('.jsonl'));
        const now = new Date();
        let deletedCount = 0;
        for (const file of files) {
            // Filename format: telemetry-YYYY-MM-DD.jsonl
            const match = file.match(/telemetry-(\d{4}-\d{2}-\d{2})\.jsonl/);
            if (match) {
                const dateStr = match[1];
                const fileDate = new Date(dateStr);
                const diffTime = Math.abs(now.getTime() - fileDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > daysToKeep) {
                    fs_1.default.unlinkSync(path_1.default.join(this.logDir, file));
                    deletedCount++;
                }
            }
        }
        return deletedCount;
    }
}
exports.RetentionService = RetentionService;
