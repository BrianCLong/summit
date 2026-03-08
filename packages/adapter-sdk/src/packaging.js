"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdapterPackage = createAdapterPackage;
// @ts-nocheck
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_path_1 = __importDefault(require("node:path"));
const adapter_loader_js_1 = require("./adapter-loader.js");
async function createAdapterPackage(options) {
    const entryPath = await (0, adapter_loader_js_1.resolveEntry)(options.entry);
    const adapter = await (0, adapter_loader_js_1.loadAdapterModule)(entryPath);
    const outputDir = node_path_1.default.isAbsolute(options.outputDir ?? '')
        ? options.outputDir ?? 'artifacts'
        : node_path_1.default.resolve(process.cwd(), options.outputDir ?? 'artifacts');
    const bundleName = adapter.metadata.name.replace(/\s+/g, '-').toLowerCase();
    const bundlePath = node_path_1.default.join(outputDir, `${bundleName}-bundle`);
    await fs_extra_1.default.ensureDir(bundlePath);
    await fs_extra_1.default.copy(entryPath, node_path_1.default.join(bundlePath, node_path_1.default.basename(entryPath)));
    const manifest = {
        name: adapter.metadata.name,
        version: adapter.metadata.version,
        description: adapter.metadata.description,
        entry: node_path_1.default.basename(entryPath),
        contract: 'basic-webhook',
        builtAt: new Date().toISOString()
    };
    const manifestName = options.manifestName ?? 'adapter-manifest.json';
    const manifestPath = node_path_1.default.join(bundlePath, manifestName);
    await fs_extra_1.default.writeJSON(manifestPath, manifest, { spaces: 2 });
    return { manifestPath, bundlePath };
}
