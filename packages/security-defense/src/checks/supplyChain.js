"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSupplyChainChecks = void 0;
const path_1 = __importDefault(require("path"));
const fs_utils_js_1 = require("../fs-utils.js");
const SBOM_PATTERNS = ['**/*sbom*.json', '**/*sbom*.xml'];
const PROVENANCE_PATTERNS = ['**/*provenance*.json', '**/*attestation*.json'];
const IMAGE_FILE_PATTERNS = ['k8s/**/*.{yml,yaml}', 'helm/**/*.{yml,yaml}', 'services/**/*.{yml,yaml}', '**/kubernetes/**/*.{yml,yaml}'];
const imageRegex = /image:\s*"?([^"\s]+)"?/i;
const loadCycloneDx = (filePath) => (0, fs_utils_js_1.readJsonFile)(filePath);
const extractImages = (filePath) => {
    const content = (0, fs_utils_js_1.loadFile)(filePath);
    if (!content) {
        return [];
    }
    const matches = content
        .split(/\r?\n/)
        .map((line) => line.match(imageRegex)?.[1])
        .filter(Boolean);
    return matches;
};
const hasDigest = (image) => image.includes('@sha256:');
const runSupplyChainChecks = (root, sbomBaselinePath, sbomTargetPath) => {
    const results = [];
    const sboms = (0, fs_utils_js_1.findFiles)(root, SBOM_PATTERNS);
    const provenances = (0, fs_utils_js_1.findFiles)(root, PROVENANCE_PATTERNS);
    if (sboms.length === 0) {
        results.push({
            epic: 'Epic 1',
            requirement: 'SBOM generation',
            status: 'fail',
            message: 'No SBOM artifacts were found. Generate CycloneDX SBOMs for each service.',
            remediation: 'Add SBOM generation to CI and persist artifacts under an auditable path.',
        });
    }
    else {
        results.push({
            epic: 'Epic 1',
            requirement: 'SBOM generation',
            status: 'pass',
            message: `Found ${sboms.length} SBOM artifact(s).`,
            details: { sboms },
        });
    }
    if (provenances.length === 0) {
        results.push({
            epic: 'Epic 1',
            requirement: 'Provenance attestations',
            status: 'fail',
            message: 'No provenance attestations detected. Emits SLSA-aligned attestations for builds.',
            remediation: 'Emit attestations alongside build outputs and store them next to SBOMs.',
        });
    }
    else {
        results.push({
            epic: 'Epic 1',
            requirement: 'Provenance attestations',
            status: 'pass',
            message: `Found ${provenances.length} provenance attestation(s).`,
            details: { provenances },
        });
    }
    const imageFiles = (0, fs_utils_js_1.findFiles)(root, IMAGE_FILE_PATTERNS);
    const unpinnedImages = [];
    imageFiles.forEach((file) => {
        extractImages(file).forEach((image) => {
            if (!hasDigest(image)) {
                unpinnedImages.push({ file, image });
            }
        });
    });
    if (unpinnedImages.length > 0) {
        results.push({
            epic: 'Epic 1',
            requirement: 'Digest pinning',
            status: 'fail',
            message: 'Container images without digest pinning detected.',
            remediation: 'Reference images with an immutable sha256 digest (e.g., repo@sha256:abc).',
            details: { unpinnedImages },
        });
    }
    else {
        results.push({
            epic: 'Epic 1',
            requirement: 'Digest pinning',
            status: 'pass',
            message: 'All referenced container images are digest-pinned.',
        });
    }
    const baselinePath = sbomBaselinePath || (0, fs_utils_js_1.findFirstExisting)(root, ['sbom-baseline.json', path_1.default.join('artifacts', 'sbom-baseline.json')]);
    const targetPath = sbomTargetPath || (0, fs_utils_js_1.findFirstExisting)(root, ['sbom-latest.json', path_1.default.join('artifacts', 'sbom-latest.json')]);
    if (baselinePath && targetPath) {
        const baseline = loadCycloneDx(baselinePath) ?? { components: [] };
        const target = loadCycloneDx(targetPath) ?? { components: [] };
        const baselineKeys = new Set((baseline.components ?? []).map((component) => component.purl || `${component.name}@${component.version}`));
        const targetKeys = new Set((target.components ?? []).map((component) => component.purl || `${component.name}@${component.version}`));
        const added = [...targetKeys].filter((item) => item && !baselineKeys.has(item));
        const removed = [...baselineKeys].filter((item) => item && !targetKeys.has(item));
        results.push({
            epic: 'Epic 1',
            requirement: 'SBOM diffing',
            status: added.length === 0 && removed.length === 0 ? 'pass' : 'fail',
            message: added.length === 0 && removed.length === 0 ? 'No SBOM drift detected between baseline and target.' : 'SBOM drift detected between baseline and target.',
            remediation: added.length || removed.length ? 'Review dependency changes and approve via documented exception workflow.' : undefined,
            details: { added, removed, baselinePath, targetPath },
        });
    }
    else {
        results.push({
            epic: 'Epic 1',
            requirement: 'SBOM diffing',
            status: 'fail',
            message: 'Missing SBOM baseline and/or target artifacts required for diffing.',
            remediation: 'Persist baseline and current SBOMs (e.g., artifacts/sbom-baseline.json and artifacts/sbom-latest.json).',
        });
    }
    return results;
};
exports.runSupplyChainChecks = runSupplyChainChecks;
