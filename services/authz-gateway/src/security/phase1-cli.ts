import path from 'path';
import fs from 'fs';
import {
  assertExceptionsValid,
  assertNotInFreeze,
  buildDeterministicHmac,
  cosignSignArtifact,
  cosignVerifyArtifact,
  digestForPath,
  generateProvenance,
  generateSbom,
  loadExceptionPolicy,
  loadFreezeWindows,
  Phase1GateError,
} from './phase1';

function main(): void {
  try {
    const rootDir = path.resolve(__dirname, '..', '..');
    const policyDir = path.join(rootDir, 'policy', 'phase1');
    const packageJsonPath = path.join(rootDir, 'package.json');
    const distDir = path.join(rootDir, 'dist', 'security');
    fs.mkdirSync(distDir, { recursive: true });

    const exceptionPolicy = loadExceptionPolicy(path.join(policyDir, 'exception-allowlist.json'));
    assertExceptionsValid(exceptionPolicy);

    const freezeWindows = loadFreezeWindows(path.join(policyDir, 'freeze-windows.json'));
    const actor = process.env.DEPLOY_ACTOR;
    const breakGlass = process.env.BREAK_GLASS_TOKEN;
    assertNotInFreeze(freezeWindows, new Date(), actor, breakGlass);

    const sbomPath = path.join(distDir, 'sbom.json');
    generateSbom(packageJsonPath, sbomPath);

    const imageDigest = process.env.IMAGE_DIGEST ?? buildDeterministicHmac(digestForPath(path.join(rootDir, 'dist')));
    const provenancePath = path.join(distDir, 'provenance.json');
    generateProvenance(
      {
        imageDigest,
        repository: process.env.GITHUB_REPOSITORY ?? 'summit/authz-gateway',
        commit: process.env.GITHUB_SHA ?? 'local',
        ref: process.env.GITHUB_REF ?? 'local',
        buildCommand: process.env.BUILD_COMMAND ?? 'npm run build',
        artifacts: [sbomPath],
      },
      provenancePath,
    );

    if (process.env.ENABLE_COSIGN === 'true') {
      const sbomSig = cosignSignArtifact(sbomPath, process.env.COSIGN_CERT_CHAIN);
      cosignVerifyArtifact(sbomPath, sbomSig);

      const provenanceSig = cosignSignArtifact(provenancePath, process.env.COSIGN_CERT_CHAIN);
      cosignVerifyArtifact(provenancePath, provenanceSig);
    }

    // Write a marker to enable downstream jobs to collect artifacts
    fs.writeFileSync(path.join(distDir, 'gate-status.txt'), 'phase1 gates passed');
    // eslint-disable-next-line no-console
    console.log('Phase 1 gates validated: SBOM, provenance, exceptions, freeze checks complete');
  } catch (error) {
    const message = error instanceof Phase1GateError ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
