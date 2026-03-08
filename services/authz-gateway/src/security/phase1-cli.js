"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const phase1_1 = require("./phase1");
function main() {
    try {
        const rootDir = path_1.default.resolve(__dirname, '..', '..');
        const policyDir = path_1.default.join(rootDir, 'policy', 'phase1');
        const packageJsonPath = path_1.default.join(rootDir, 'package.json');
        const distDir = path_1.default.join(rootDir, 'dist', 'security');
        fs_1.default.mkdirSync(distDir, { recursive: true });
        const exceptionPolicy = (0, phase1_1.loadExceptionPolicy)(path_1.default.join(policyDir, 'exception-allowlist.json'));
        (0, phase1_1.assertExceptionsValid)(exceptionPolicy);
        const freezeWindows = (0, phase1_1.loadFreezeWindows)(path_1.default.join(policyDir, 'freeze-windows.json'));
        const actor = process.env.DEPLOY_ACTOR;
        const breakGlass = process.env.BREAK_GLASS_TOKEN;
        (0, phase1_1.assertNotInFreeze)(freezeWindows, new Date(), actor, breakGlass);
        const sbomPath = path_1.default.join(distDir, 'sbom.json');
        (0, phase1_1.generateSbom)(packageJsonPath, sbomPath);
        const imageDigest = process.env.IMAGE_DIGEST ?? (0, phase1_1.buildDeterministicHmac)((0, phase1_1.digestForPath)(path_1.default.join(rootDir, 'dist')));
        const provenancePath = path_1.default.join(distDir, 'provenance.json');
        (0, phase1_1.generateProvenance)({
            imageDigest,
            repository: process.env.GITHUB_REPOSITORY ?? 'summit/authz-gateway',
            commit: process.env.GITHUB_SHA ?? 'local',
            ref: process.env.GITHUB_REF ?? 'local',
            buildCommand: process.env.BUILD_COMMAND ?? 'npm run build',
            artifacts: [sbomPath],
        }, provenancePath);
        if (process.env.ENABLE_COSIGN === 'true') {
            const sbomSig = (0, phase1_1.cosignSignArtifact)(sbomPath, process.env.COSIGN_CERT_CHAIN);
            (0, phase1_1.cosignVerifyArtifact)(sbomPath, sbomSig);
            const provenanceSig = (0, phase1_1.cosignSignArtifact)(provenancePath, process.env.COSIGN_CERT_CHAIN);
            (0, phase1_1.cosignVerifyArtifact)(provenancePath, provenanceSig);
        }
        // Write a marker to enable downstream jobs to collect artifacts
        fs_1.default.writeFileSync(path_1.default.join(distDir, 'gate-status.txt'), 'phase1 gates passed');
        // eslint-disable-next-line no-console
        console.log('Phase 1 gates validated: SBOM, provenance, exceptions, freeze checks complete');
    }
    catch (error) {
        const message = error instanceof phase1_1.Phase1GateError ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error(message);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
exports.default = main;
