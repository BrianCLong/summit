"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wasSeen = wasSeen;
exports.markSeen = markSeen;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PATH = process.env.SEEN_TICKETS_FILE || '/data/seen.json';
let set = new Set();
try {
    set = new Set(JSON.parse(fs_1.default.readFileSync(PATH, 'utf8')));
}
catch { }
function wasSeen(id) {
    return set.has(id);
}
function markSeen(id) {
    set.add(id);
    fs_1.default.mkdirSync(path_1.default.dirname(PATH), { recursive: true });
    fs_1.default.writeFileSync(PATH, JSON.stringify([...set]));
}
