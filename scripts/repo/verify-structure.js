"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const checks = [
    'src/evals',
    'src/graph',
    'src/summit',
    'artifacts',
    '.github/workflows'
];
const results = checks.map(p => ({
    path: p,
    exists: fs_1.default.existsSync(path_1.default.resolve(process.cwd(), p))
}));
console.log(JSON.stringify(results, null, 2));
