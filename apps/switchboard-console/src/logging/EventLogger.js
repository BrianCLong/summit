"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLogger = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
class EventLogger {
    sessionDir;
    eventsPath;
    constructor(sessionDir) {
        this.sessionDir = sessionDir;
        this.eventsPath = node_path_1.default.join(this.sessionDir, 'events.jsonl');
    }
    async init() {
        await (0, promises_1.mkdir)(this.sessionDir, { recursive: true });
    }
    async log(event) {
        await (0, promises_1.appendFile)(this.eventsPath, `${JSON.stringify(event)}\n`);
    }
    get path() {
        return this.eventsPath;
    }
}
exports.EventLogger = EventLogger;
