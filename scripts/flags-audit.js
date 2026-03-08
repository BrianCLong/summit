"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const flags = js_yaml_1.default.load(fs_1.default.readFileSync('feature-flags/flags.yaml', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const expired = Object.entries(flags.features || flags).filter(([, v]) => v.expires && v.expires < today);
if (expired.length) {
    console.error('Expired flags:', expired.map(([k]) => k).join(','));
    process.exit(1);
}
console.log('No expired flags.');
