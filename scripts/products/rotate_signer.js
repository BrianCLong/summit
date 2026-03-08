#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
async function main() {
    const cfg = js_yaml_1.default.load(fs_1.default.readFileSync('config/signing/byok.yaml', 'utf8'));
    console.log(`rotating signer for ${cfg.tenantId}`);
    // Placeholder for dual-control rotation logic
}
main();
