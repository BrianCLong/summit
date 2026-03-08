"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const kind = process.argv[2];
const name = process.argv[3];
if (!kind || !name) {
    console.error('Usage: pnpm yo:maestro service <name>');
    process.exit(1);
}
const dest = `services/${name}`;
fs_1.default.mkdirSync(dest, { recursive: true });
fs_1.default.writeFileSync(path_1.default.join(dest, 'src/index.ts'), `import express from "express"; const app=express(); app.get("/health",(_,r)=>r.json({ok:true})); app.listen(process.env.PORT||0);`);
fs_1.default.writeFileSync(path_1.default.join(dest, 'package.json'), JSON.stringify({ name: `@intelgraph/${name}`, scripts: { build: 'tsc -b', test: 'jest' } }, null, 2));
console.log(`✅ scaffolded ${kind} ${name}`);
