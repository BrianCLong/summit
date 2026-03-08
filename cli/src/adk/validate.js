"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateManifestCommand = validateManifestCommand;
const node_path_1 = __importDefault(require("node:path"));
const manifest_js_1 = require("./manifest.js");
async function validateManifestCommand(manifestPath) {
    const report = await (0, manifest_js_1.validateManifest)(manifestPath);
    const reportPath = node_path_1.default.resolve(process.cwd(), 'validate.report.json');
    await (0, manifest_js_1.writeDeterministicJson)(reportPath, report);
    return { reportPath, ok: report.ok };
}
