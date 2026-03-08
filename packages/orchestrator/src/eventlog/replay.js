"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayEvents = replayEvents;
const fs_extra_1 = __importDefault(require("fs-extra"));
const readline_1 = __importDefault(require("readline"));
async function replayEvents(logPath) {
    if (!await fs_extra_1.default.pathExists(logPath))
        return [];
    const fileStream = fs_extra_1.default.createReadStream(logPath);
    const rl = readline_1.default.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    const events = [];
    for await (const line of rl) {
        if (line.trim()) {
            try {
                events.push(JSON.parse(line));
            }
            catch (e) {
                console.error('Malformed event line:', line);
            }
        }
    }
    return events;
}
