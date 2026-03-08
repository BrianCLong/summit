"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionRecorder = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_LOG_PATH = node_path_1.default.resolve(process.cwd(), '.evidence', 'llm', 'decisions.jsonl');
class DecisionRecorder {
    logPath;
    constructor(logPath = DEFAULT_LOG_PATH) {
        this.logPath = logPath;
    }
    getLogPath() {
        return this.logPath;
    }
    async record(record) {
        const dir = node_path_1.default.dirname(this.logPath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.appendFile(this.logPath, `${JSON.stringify(record)}\n`, 'utf8');
    }
    async load(decisionId) {
        let content;
        try {
            content = await promises_1.default.readFile(this.logPath, 'utf8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
        for (const line of content.split('\n')) {
            if (!line.trim())
                continue;
            const parsed = JSON.parse(line);
            if (parsed.decisionId === decisionId) {
                return parsed;
            }
        }
        return null;
    }
}
exports.DecisionRecorder = DecisionRecorder;
