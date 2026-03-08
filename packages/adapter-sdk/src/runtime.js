"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAdapter = executeAdapter;
// @ts-nocheck
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_path_1 = __importDefault(require("node:path"));
const node_perf_hooks_1 = require("node:perf_hooks");
const adapter_loader_js_1 = require("./adapter-loader.js");
const index_js_1 = require("./testing/fixtures/index.js");
async function loadJsonFile(filePath) {
    if (!filePath) {
        return undefined;
    }
    const absolutePath = node_path_1.default.isAbsolute(filePath)
        ? filePath
        : node_path_1.default.join(process.cwd(), filePath);
    if (!(await fs_extra_1.default.pathExists(absolutePath))) {
        throw new Error(`Fixture file not found at ${absolutePath}`);
    }
    return fs_extra_1.default.readJSON(absolutePath);
}
async function executeAdapter(options) {
    const entryPath = await (0, adapter_loader_js_1.resolveEntry)(options.entry);
    const adapter = await (0, adapter_loader_js_1.loadAdapterModule)(entryPath);
    const event = (await loadJsonFile(options.eventPath)) ?? index_js_1.basicEvent;
    const context = (await loadJsonFile(options.contextPath)) ?? index_js_1.basicContext;
    const started = node_perf_hooks_1.performance.now();
    const result = await adapter.handleEvent(event, context);
    const elapsed = Math.round(node_perf_hooks_1.performance.now() - started);
    return {
        ...result,
        durationMs: result.durationMs ?? elapsed
    };
}
