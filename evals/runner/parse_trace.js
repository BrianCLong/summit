"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTrace = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const parseTrace = async (tracePath) => {
    const raw = await promises_1.default.readFile(tracePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.map((line) => JSON.parse(line));
};
exports.parseTrace = parseTrace;
