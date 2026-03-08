"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDisclosurePack = buildDisclosurePack;
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const sbom_js_1 = require("../supply-chain/sbom.js");
async function buildDisclosurePack(inputs) {
    const sbomPath = await (0, sbom_js_1.writeSbom)(inputs.manifestDir, node_path_1.default.join(inputs.outputDir, 'artifacts'));
    const packMeta = {
        generatedAt: new Date().toISOString(),
        policyBundleVersion: inputs.policyBundleVersion,
        deploymentAttestation: inputs.deploymentAttestation,
        sbomPath: node_path_1.default.relative(inputs.outputDir, sbomPath),
    };
    const packPath = node_path_1.default.join(inputs.outputDir, 'disclosure-pack.json');
    await (0, promises_1.writeFile)(packPath, JSON.stringify(packMeta, null, 2), 'utf-8');
    return packPath;
}
