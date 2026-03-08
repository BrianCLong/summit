"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const now = new Date().toISOString();
const wins = JSON.parse(fs_1.default.readFileSync('.maestro/freeze_windows.json', 'utf8'));
const blocked = wins.find((w) => now >= w.from && now <= w.to);
if (blocked) {
    console.error(`❌ freeze window '${blocked.name}' in effect`);
    process.exit(1);
}
console.log('✅ no freeze windows active');
