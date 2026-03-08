"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const specs = new Set(JSON.parse(fs_1.default.readFileSync('artifacts/specs.json', 'utf8')));
const annos = Array.from(fs_1.default
    .readFileSync('coverage/annotations.txt', 'utf8')
    .matchAll(/@spec (SPEC-\d+)/g)).map((m) => m[1]);
const missing = [...specs].filter((id) => !annos.includes(id));
if (missing.length) {
    console.error('Missing spec tests:', missing);
    process.exit(1);
}
