"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceStore = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class TraceStore {
    baseDir;
    constructor(baseDir = process.cwd()) {
        this.baseDir = (0, path_1.join)(baseDir, '.summit/agent-trace/records');
    }
    saveRecord(record) {
        const revision = record.vcs?.revision || 'unknown';
        const dir = (0, path_1.join)(this.baseDir, revision);
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        const filePath = (0, path_1.join)(dir, `${record.id}.json`);
        (0, fs_1.writeFileSync)(filePath, JSON.stringify(record, null, 2));
    }
    loadRecords(revision) {
        const dir = (0, path_1.join)(this.baseDir, revision);
        if (!(0, fs_1.existsSync)(dir))
            return [];
        const files = (0, fs_1.readdirSync)(dir).filter(f => f.endsWith('.json'));
        return files.map(f => JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(dir, f), 'utf8')));
    }
    listRevisions() {
        if (!(0, fs_1.existsSync)(this.baseDir))
            return [];
        return (0, fs_1.readdirSync)(this.baseDir);
    }
}
exports.TraceStore = TraceStore;
