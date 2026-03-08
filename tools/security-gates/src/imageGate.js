"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceImageGate = enforceImageGate;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function enforceImageGate(rootDir, config) {
    const issues = [];
    config.stageImages.forEach((image) => {
        const digestIssue = validateDigest(image);
        if (digestIssue) {
            issues.push(`${image.name}: ${digestIssue}`);
        }
        const signatureIssue = validateArtifact(rootDir, image.signaturePath, 'signature');
        if (signatureIssue) {
            issues.push(`${image.name}: ${signatureIssue}`);
        }
        const provenanceIssue = validateArtifact(rootDir, image.provenancePath, 'provenance');
        if (provenanceIssue) {
            issues.push(`${image.name}: ${provenanceIssue}`);
        }
    });
    return {
        gate: 'image',
        ok: issues.length === 0,
        details: issues.length ? issues : ['All stage images are digest pinned with signature and provenance evidence']
    };
}
function validateDigest(image) {
    if (!image.digest.startsWith('sha256:') || image.digest.length < 71) {
        return 'image digest must be a sha256 hash';
    }
    if (!image.name.includes('@sha256:')) {
        return 'image reference must be digest pinned (name@sha256:<digest>)';
    }
    return undefined;
}
function validateArtifact(rootDir, relativePath, artifact) {
    const resolved = node_path_1.default.resolve(rootDir, relativePath);
    if (!node_fs_1.default.existsSync(resolved)) {
        return `${artifact} missing at ${relativePath}`;
    }
    const content = node_fs_1.default.readFileSync(resolved, 'utf-8').trim();
    if (!content.length) {
        return `${artifact} file ${relativePath} is empty`;
    }
    return undefined;
}
