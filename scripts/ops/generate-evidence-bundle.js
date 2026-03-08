#!/usr/bin/env -S node --loader ts-node/esm
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const VERSION = '1.0.0';
const parseList = (input) => {
    if (!input)
        return [];
    return input
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean);
};
const parseKeyValueList = (input) => {
    if (!input)
        return [];
    return input
        .split(',')
        .map(pair => pair.trim())
        .filter(Boolean)
        .map(pair => {
        const [name, digest] = pair.split('=');
        return { name: name?.trim() || 'unknown', digest: digest?.trim() || 'unknown' };
    });
};
const fileExists = async (filePath) => {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch (error) {
        return false;
    }
};
const sha256File = async (filePath) => {
    if (!(await fileExists(filePath)))
        return undefined;
    const data = await fs_1.promises.readFile(filePath);
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
};
const commandExists = async (command) => {
    try {
        await execAsync(`command -v ${command}`);
        return true;
    }
    catch (error) {
        return false;
    }
};
const optionalRun = async (command) => {
    try {
        const result = await execAsync(command);
        return result.stdout.trim();
    }
    catch (error) {
        return undefined;
    }
};
const resolveGitInfo = async () => {
    const commit = process.env.GITHUB_SHA || (await optionalRun('git rev-parse HEAD')) || 'unknown';
    const branch = process.env.GITHUB_REF_NAME ||
        process.env.GITHUB_HEAD_REF ||
        process.env.GITHUB_REF ||
        (await optionalRun('git rev-parse --abbrev-ref HEAD')) ||
        'unknown';
    const shortCommit = commit.slice(0, 12);
    const message = await optionalRun(`git show -s --format=%s ${commit}`);
    return { commit, branch, shortCommit, message };
};
const gatherArtifacts = async (paths, label) => {
    const records = [];
    for (const artifactPath of paths) {
        const normalizedPath = path_1.default.resolve(artifactPath);
        const present = await fileExists(normalizedPath);
        const digest = present ? await sha256File(normalizedPath) : undefined;
        records.push({
            name: path_1.default.basename(artifactPath) || label,
            path: normalizedPath,
            sha256: digest,
        });
    }
    return records;
};
const maybeSignBundle = async (bundlePath) => {
    if (process.env.EVIDENCE_SIGN !== 'true')
        return undefined;
    const cosignAvailable = await commandExists('cosign');
    if (!cosignAvailable) {
        console.warn('Cosign not available, skipping signature.');
        return undefined;
    }
    const signaturePath = `${bundlePath}.sig`;
    const certificatePath = `${bundlePath}.crt`;
    try {
        await execAsync(`cosign sign-blob --yes --output-signature ${signaturePath} --output-certificate ${certificatePath} ${bundlePath}`, { env: { ...process.env, COSIGN_EXPERIMENTAL: process.env.COSIGN_EXPERIMENTAL || 'true' } });
        return { signaturePath, certificatePath };
    }
    catch (error) {
        console.warn('Cosign signing failed; continuing without signature.');
        return undefined;
    }
};
const buildEvidenceBundle = async () => {
    const args = process.argv.slice(2);
    const cliArtifacts = args
        .filter(arg => arg.startsWith('--artifact='))
        .map(arg => arg.replace('--artifact=', ''));
    const cliSboms = args
        .filter(arg => arg.startsWith('--sbom='))
        .map(arg => arg.replace('--sbom=', ''));
    const cliTestReports = args
        .filter(arg => arg.startsWith('--test-report='))
        .map(arg => arg.replace('--test-report=', ''));
    const cliSecurityReports = args
        .filter(arg => arg.startsWith('--security-report='))
        .map(arg => arg.replace('--security-report=', ''));
    const artifactPaths = [...parseList(process.env.ARTIFACT_PATHS), ...cliArtifacts];
    const sbomPaths = [...parseList(process.env.SBOM_PATHS), ...cliSboms];
    const testReports = [...parseList(process.env.TEST_REPORTS), ...cliTestReports];
    const securityReports = [...parseList(process.env.SECURITY_REPORTS), ...cliSecurityReports];
    const gitInfo = await resolveGitInfo();
    const workflowUrl = process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || ''}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : undefined;
    const [artifactRecords, sbomRecords] = await Promise.all([
        gatherArtifacts(artifactPaths, 'artifact'),
        gatherArtifacts(sbomPaths, 'sbom'),
    ]);
    const testDigestSummaries = await gatherArtifacts(testReports, 'test-report');
    const securityDigestSummaries = await gatherArtifacts(securityReports, 'security-report');
    const imageDigests = parseKeyValueList(process.env.IMAGE_DIGESTS);
    const testsSummary = process.env.TEST_RESULTS_SUMMARY ||
        (testDigestSummaries.length > 0
            ? 'Test report files attached in artifacts.'
            : 'No test summary provided.');
    const securitySummary = process.env.SECURITY_SCAN_SUMMARY ||
        (securityDigestSummaries.length > 0
            ? 'Security scan reports attached in artifacts.'
            : 'No security scan summary provided.');
    const evidence = {
        version: VERSION,
        generatedAt: new Date().toISOString(),
        git: {
            commit: gitInfo.commit,
            shortCommit: gitInfo.shortCommit,
            branch: gitInfo.branch,
            message: gitInfo.message,
        },
        workflow: {
            runId: process.env.GITHUB_RUN_ID,
            runAttempt: process.env.GITHUB_RUN_ATTEMPT,
            workflowName: process.env.GITHUB_WORKFLOW,
            job: process.env.GITHUB_JOB,
            url: workflowUrl,
        },
        summary: {
            tests: testsSummary,
            security: securitySummary,
        },
        artifacts: {
            files: [...artifactRecords, ...testDigestSummaries, ...securityDigestSummaries],
            images: imageDigests,
            sboms: sbomRecords,
        },
        attestations: {
            cosignSigned: false,
            provenance: process.env.SLSA_PROVENANCE_PATH,
        },
        notes: process.env.EVIDENCE_NOTES,
    };
    const outputDir = path_1.default.resolve('evidence-bundles');
    await fs_1.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path_1.default.join(outputDir, `evidence-${gitInfo.commit}.json`);
    await fs_1.promises.writeFile(outputPath, JSON.stringify(evidence, null, 2));
    const signature = await maybeSignBundle(outputPath);
    if (signature) {
        evidence.attestations.cosignSigned = true;
        evidence.attestations.cosignSignature = signature.signaturePath;
        evidence.attestations.cosignCertificate = signature.certificatePath;
        await fs_1.promises.writeFile(outputPath, JSON.stringify(evidence, null, 2));
    }
    console.log(`Evidence bundle written to ${outputPath}`);
    if (signature) {
        console.log(`Cosign signature: ${signature.signaturePath}`);
    }
};
buildEvidenceBundle().catch(error => {
    console.error('Failed to generate evidence bundle:', error);
    process.exitCode = 1;
});
