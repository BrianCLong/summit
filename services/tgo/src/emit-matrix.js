"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plan_1 = require("./plan");
const fs_1 = __importDefault(require("fs"));
const changed = fs_1.default
    .readFileSync('changed.txt', 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean);
const tasks = (0, plan_1.planPR)(changed).filter((t) => ['test', 'build', 'lint', 'policy'].includes(t.kind));
const matrix = {
    include: tasks.map((t) => ({ id: t.id, kind: t.kind, files: t.files || [] })),
};
process.stdout.write(JSON.stringify(matrix));
