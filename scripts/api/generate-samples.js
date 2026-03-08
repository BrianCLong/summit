"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/api/generate-samples.ts – stub using openapi-snippet
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const specPath = node_path_1.default.resolve(__dirname, '../../api/intelgraph-core-api.yaml');
const spec = node_fs_1.default.readFileSync(specPath, 'utf8');
// Parse spec (use your preferred parser), then for a few key endpoints build samples:
// new HTTPSnippet(har).convert('shell', 'curl') etc. Write mdx fragments into docs/reference/api/samples/
