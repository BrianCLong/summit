"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppendOnlyLedger = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const hashing_js_1 = require("./hashing.js");
class AppendOnlyLedger {
    ledgerPath;
    constructor(ledgerPath) {
        this.ledgerPath = ledgerPath;
    }
    ensureDir() {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(this.ledgerPath), { recursive: true });
    }
    readLastHash() {
        if (!node_fs_1.default.existsSync(this.ledgerPath))
            return undefined;
        const content = node_fs_1.default.readFileSync(this.ledgerPath, 'utf8').trim();
        if (!content)
            return undefined;
        const lastLine = content.split('\n').pop();
        if (!lastLine)
            return undefined;
        const last = JSON.parse(lastLine);
        return last.hash;
    }
    append(entry) {
        this.ensureDir();
        const prev_hash = entry.prev_hash ?? this.readLastHash();
        const withoutHash = {
            ...entry,
            prev_hash
        };
        const hash = (0, hashing_js_1.sha256Hex)((0, hashing_js_1.canonicalJson)(withoutHash));
        const full = { ...withoutHash, hash };
        node_fs_1.default.appendFileSync(this.ledgerPath, `${JSON.stringify(full)}\n`, 'utf8');
        return full;
    }
}
exports.AppendOnlyLedger = AppendOnlyLedger;
