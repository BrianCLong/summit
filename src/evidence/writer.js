"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSensitive = redactSensitive;
exports.writeEvidenceFiles = writeEvidenceFiles;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const evid_1 = require("./evid");
function redactSensitive(input) {
    const redactKeys = new Set(['raw_media_bytes', 'faces', 'phone_numbers', 'emails']);
    return Object.keys(input).reduce((acc, key) => {
        if (!redactKeys.has(key)) {
            acc[key] = input[key];
        }
        return acc;
    }, {});
}
function writeEvidenceFiles(baseOutDir, bundleWithoutHash, inputManifestSha256) {
    const cleanFindings = bundleWithoutHash.findings.map((f) => redactSensitive(f));
    const stableBundle = { ...bundleWithoutHash, findings: cleanFindings };
    const bundleSha = (0, evid_1.sha256Hex)((0, evid_1.canonicalStringify)(stableBundle));
    const bundle = {
        ...stableBundle,
        hashes: {
            input_manifest_sha256: inputManifestSha256,
            bundle_sha256: bundleSha,
        },
    };
    const outDir = (0, node_path_1.join)(baseOutDir, bundle.evid);
    (0, node_fs_1.mkdirSync)(outDir, { recursive: true });
    const report = {
        evid: bundle.evid,
        steps: bundle.steps,
        findings: bundle.findings,
    };
    const provenance = {
        evid: bundle.evid,
        policy: bundle.policy,
        hashes: bundle.hashes,
        fixtures: bundle.inputs,
    };
    const metrics = {
        step_count: bundle.steps.length,
        blocked_steps: bundle.steps.filter((s) => s.status === 'blocked').length,
        finding_count: bundle.findings.length,
    };
    const stamp = {
        evid: bundle.evid,
        bundle_sha256: bundle.hashes.bundle_sha256,
        policy_network: bundle.policy.network,
        connectors_allowlist: bundle.policy.connectors?.allowlist ?? [],
    };
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outDir, 'report.json'), `${(0, evid_1.canonicalStringify)(report)}\n`, 'utf8');
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outDir, 'provenance.json'), `${(0, evid_1.canonicalStringify)(provenance)}\n`, 'utf8');
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outDir, 'metrics.json'), `${(0, evid_1.canonicalStringify)(metrics)}\n`, 'utf8');
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outDir, 'stamp.json'), `${(0, evid_1.canonicalStringify)(stamp)}\n`, 'utf8');
    return bundle;
}
