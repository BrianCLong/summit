"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.est = void 0;
const fs_1 = __importDefault(require("fs"));
const hist = JSON.parse(fs_1.default.readFileSync('tools/ci/durations.json', 'utf8')); // { testPath: avgSec }
const est = (files) => Math.max(15, files.reduce((s, f) => s + (hist[f] || 20), 0) / 4);
exports.est = est;
