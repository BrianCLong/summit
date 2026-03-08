"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const bp = js_yaml_1.default.load(fs_1.default.readFileSync(process.argv[2], 'utf8'));
const name = process.argv[3];
if (!name)
    throw new Error('Usage: pnpm bp:new <blueprint.yaml> <name>');
for (const f of bp.scaffold.files) {
    const p = f.path.replace(/\$\{name\}/g, name);
    fs_1.default.mkdirSync(path_1.default.dirname(p), { recursive: true });
    fs_1.default.writeFileSync(p, f.content.replace(/\$\{name\}/g, name));
}
console.log(`✅ scaffolded ${name}`);
