"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTrace = void 0;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ExecutionTrace {
    context;
    evidenceDir;
    constructor(context) {
        this.context = {
            ...context,
            traceId: (0, crypto_1.randomUUID)(),
            startTime: new Date().toISOString()
        };
        // Ensure evidence directory exists
        this.evidenceDir = path_1.default.join(process.cwd(), 'evidence', 'traces');
        if (!fs_1.default.existsSync(this.evidenceDir)) {
            fs_1.default.mkdirSync(this.evidenceDir, { recursive: true });
        }
    }
    getTraceId() {
        return this.context.traceId;
    }
    async record(result) {
        const endTime = new Date().toISOString();
        const durationMs = new Date(endTime).getTime() - new Date(this.context.startTime).getTime();
        const traceArtifact = {
            ...this.context,
            result: {
                ...result,
                endTime,
                durationMs
            },
            schema_version: "1.0.0",
            compliance_tags: ["traceability", "eu_ai_act_art_12"]
        };
        const filepath = path_1.default.join(this.evidenceDir, `${this.context.traceId}.json`);
        await fs_1.default.promises.writeFile(filepath, JSON.stringify(traceArtifact, null, 2));
        return traceArtifact;
    }
}
exports.ExecutionTrace = ExecutionTrace;
