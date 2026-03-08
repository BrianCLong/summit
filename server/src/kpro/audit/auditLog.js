"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonlAuditLog = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class JsonlAuditLog {
    filePath;
    nextSequence = 1;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async append(event) {
        const entry = {
            sequence: event.sequence ?? this.nextSequence++,
            timestamp: event.timestamp ?? new Date().toISOString(),
            runId: event.runId,
            type: event.type,
            payload: event.payload,
        };
        await fs_1.promises.mkdir(path_1.default.dirname(this.filePath), { recursive: true });
        await fs_1.promises.appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
    }
    async readAll() {
        try {
            const content = await fs_1.promises.readFile(this.filePath);
            const text = String(content);
            return text
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .map((line) => JSON.parse(line));
        }
        catch (error) {
            if (error?.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}
exports.JsonlAuditLog = JsonlAuditLog;
