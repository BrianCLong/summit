"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_glob_1 = __importDefault(require("fast-glob"));
const fs_1 = __importDefault(require("fs"));
const files = fast_glob_1.default.sync([
    'server/src/**/*.ts',
    'services/**/src/**/*.ts',
    'charts/**/*.yaml',
]);
const data = {
    files,
    hasCilium: files.some((f) => /charts\/flow-audit/.test(f)),
};
fs_1.default.writeFileSync('arch_scan.json', JSON.stringify(data, null, 2));
