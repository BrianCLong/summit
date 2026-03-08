"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const loader_1 = require("../../loader");
const compile_1 = require("../compile");
const baseDir = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const examplesDir = (0, node_path_1.resolve)(baseDir, '..', '..', '..', '..', 'procedures', 'examples');
(0, node_test_1.default)('compiled plan matches golden output', async () => {
    const procedure = await (0, loader_1.loadProcedureFromFile)((0, node_path_1.resolve)(examplesDir, 'basic-investigation.yaml'));
    const plan = (0, compile_1.compileProcedure)(procedure);
    const serialized = (0, compile_1.serializePlan)(plan);
    const golden = await (0, promises_1.readFile)((0, node_path_1.resolve)(examplesDir, 'basic-investigation.plan.json'), 'utf8');
    strict_1.default.equal(serialized, golden);
});
