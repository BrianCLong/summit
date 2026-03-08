"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const pkgs = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'))
    .workspaces;
const lines = ['# AUTO-GENERATED — DO NOT EDIT'];
for (const p of pkgs) {
    lines.push(`${p} @intelgraph/backend @intelgraph/ops`);
}
fs_1.default.writeFileSync('.github/CODEOWNERS', lines.join('\n'));
