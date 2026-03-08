"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvidenceBundle = exports.buildEvidenceBundle = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const buildEvidenceBundle = (data) => ({
    skill: data.skill ?? 'unknown-skill',
    inputs: data.inputs ?? {},
    tool_calls: data.tool_calls ?? [],
    outputs: data.outputs ?? {},
    diffs: data.diffs ?? { files: [], summary: '' },
    checksums: data.checksums ?? {},
    policy: data.policy ?? { allow: false, denies: [] },
    timestamp: data.timestamp ?? new Date().toISOString(),
});
exports.buildEvidenceBundle = buildEvidenceBundle;
const writeEvidenceBundle = async (baseDir, bundle, filename = 'skill-run.json') => {
    await node_fs_1.promises.mkdir(baseDir, { recursive: true });
    const outputPath = node_path_1.default.join(baseDir, filename);
    await node_fs_1.promises.writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    return outputPath;
};
exports.writeEvidenceBundle = writeEvidenceBundle;
