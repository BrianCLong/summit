"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayLog = void 0;
const fs_1 = __importDefault(require("fs"));
class ReplayLog {
    logDir;
    constructor(logDir = 'logs/llm_replay') {
        this.logDir = logDir;
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    async log(request, response, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            request,
            response,
            error: error ? { message: error.message, stack: error.stack } : null
        };
        const filename = `${this.logDir}/${request.id}.json`;
        await fs_1.default.promises.writeFile(filename, JSON.stringify(entry, null, 2));
    }
}
exports.ReplayLog = ReplayLog;
