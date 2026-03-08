#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
function run() {
    const file = process.argv[2];
    if (!file) {
        console.error('Usage: chronos-intent <workflow.yaml>');
        process.exitCode = 1;
        return;
    }
    const resolved = path_1.default.resolve(process.cwd(), file);
    const yamlText = fs_1.default.readFileSync(resolved, 'utf8');
    const ir = (0, index_1.yamlToIR)(yamlText);
    process.stdout.write(`${JSON.stringify(ir, null, 2)}\n`);
}
run();
