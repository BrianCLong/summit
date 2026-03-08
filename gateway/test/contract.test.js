"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
test('supergraph SDL is present', () => {
    const p = node_path_1.default.join(__dirname, '../supergraph/supergraph.graphql');
    const sdl = node_fs_1.default.readFileSync(p, 'utf8');
    expect(sdl).toContain('schema');
});
