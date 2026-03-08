"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppendOnlyAuditLog = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class AppendOnlyAuditLog {
    file;
    constructor(filename = 'audit.log') {
        this.file = (0, path_1.join)(process.cwd(), filename);
        (0, fs_1.mkdirSync)(process.cwd(), { recursive: true });
    }
    write(event) {
        const entry = { ...event, at: new Date().toISOString() };
        (0, fs_1.appendFileSync)(this.file, `${JSON.stringify(entry)}\n`);
    }
}
exports.AppendOnlyAuditLog = AppendOnlyAuditLog;
