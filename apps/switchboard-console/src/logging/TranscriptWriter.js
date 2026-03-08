"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptWriter = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
class TranscriptWriter {
    sessionDir;
    transcriptPath;
    constructor(sessionDir) {
        this.sessionDir = sessionDir;
        this.transcriptPath = node_path_1.default.join(this.sessionDir, 'transcript.log');
    }
    async init() {
        await (0, promises_1.mkdir)(this.sessionDir, { recursive: true });
    }
    async write(line) {
        await (0, promises_1.appendFile)(this.transcriptPath, `${line}\n`);
    }
    get path() {
        return this.transcriptPath;
    }
}
exports.TranscriptWriter = TranscriptWriter;
