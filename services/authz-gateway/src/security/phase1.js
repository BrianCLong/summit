"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phase1GateError = void 0;
exports.loadExceptionPolicy = loadExceptionPolicy;
exports.assertExceptionsValid = assertExceptionsValid;
exports.loadFreezeWindows = loadFreezeWindows;
exports.assertNotInFreeze = assertNotInFreeze;
exports.generateSbom = generateSbom;
exports.generateProvenance = generateProvenance;
exports.digestForPath = digestForPath;
exports.cosignSignArtifact = cosignSignArtifact;
exports.cosignVerifyArtifact = cosignVerifyArtifact;
exports.buildDeterministicHmac = buildDeterministicHmac;
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Phase1GateError extends Error {
}
exports.Phase1GateError = Phase1GateError;
function loadExceptionPolicy(policyPath) {
    const raw = fs_1.default.readFileSync(policyPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.updatedAt || !Array.isArray(parsed.exceptions)) {
        throw new Phase1GateError('Exception policy file is malformed');
    }
    return parsed;
}
function assertExceptionsValid(policy, now = new Date()) {
    policy.exceptions.forEach((exception) => {
        const expires = new Date(exception.expiresAt);
        if (Number.isNaN(expires.getTime())) {
            throw new Phase1GateError(`Exception ${exception.id} has invalid expiry`);
        }
        if (expires <= now) {
            throw new Phase1GateError(`Exception ${exception.id} is expired`);
        }
        if (!exception.owner || !exception.reason || !exception.scope) {
            throw new Phase1GateError(`Exception ${exception.id} missing required metadata`);
        }
    });
}
function loadFreezeWindows(freezePath) {
    const raw = fs_1.default.readFileSync(freezePath, 'utf8');
    const parsed = JSON.parse(raw);
    parsed.forEach((window) => {
        if (!window.name || !window.start || !window.end) {
            throw new Phase1GateError('Freeze window entry missing required fields');
        }
    });
    return parsed;
}
function assertNotInFreeze(freezeWindows, now = new Date(), actor, breakGlassToken) {
    const active = freezeWindows.find((window) => {
        const start = new Date(window.start);
        const end = new Date(window.end);
        return start <= now && now <= end;
    });
    if (!active)
        return;
    if (breakGlassToken && actor && active.allowedDeployers?.includes(actor)) {
        return;
    }
    const reason = `Deployment blocked: in freeze window "${active.name}" (${active.start} → ${active.end})`;
    throw new Phase1GateError(reason);
}
function generateSbom(packageJsonPath, outputPath) {
    const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
    const timestamp = new Date().toISOString();
    const dependencies = Object.entries({
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
    }).map(([name, version]) => ({ name, version }));
    const sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${cryptoRandomUuid()}`,
        version: 1,
        metadata: {
            timestamp,
            component: {
                type: 'application',
                name: packageJson.name,
                version: packageJson.version,
            },
            tools: [
                {
                    vendor: 'summit',
                    name: 'phase1-sbom-generator',
                    version: '1.0.0',
                },
            ],
        },
        components: dependencies.map((dep) => ({
            type: 'library',
            name: dep.name,
            version: dep.version,
        })),
    };
    fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
    fs_1.default.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
}
function generateProvenance(input, outputPath, clock = () => new Date()) {
    const start = clock();
    const finish = clock();
    const provenance = {
        buildType: 'https://slsa.dev/container/v1',
        metadata: {
            invocationId: cryptoRandomUuid(),
            startedOn: start.toISOString(),
            finishedOn: finish.toISOString(),
            builder: input.builderId ?? 'authz-gateway/phase1',
        },
        materials: [input.repository, input.commit, input.ref].filter(Boolean),
        subject: {
            name: input.repository,
            digest: input.imageDigest,
        },
        invocation: {
            parameters: {
                buildCommand: input.buildCommand,
                artifacts: input.artifacts ?? [],
            },
        },
    };
    fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
    fs_1.default.writeFileSync(outputPath, JSON.stringify(provenance, null, 2));
    return provenance;
}
function digestForPath(targetPath) {
    const stat = fs_1.default.statSync(targetPath);
    if (stat.isDirectory()) {
        const hash = (0, crypto_1.createHash)('sha256');
        const entries = fs_1.default.readdirSync(targetPath).sort();
        entries.forEach((entry) => {
            const full = path_1.default.join(targetPath, entry);
            hash.update(entry);
            hash.update(digestForPath(full));
        });
        return hash.digest('hex');
    }
    const fileBuffer = fs_1.default.readFileSync(targetPath);
    return (0, crypto_1.createHash)('sha256').update(fileBuffer).digest('hex');
}
function cosignSignArtifact(artifactPath, identity) {
    const signaturePath = `${artifactPath}.sig`;
    (0, child_process_1.execFileSync)('cosign', ['sign-blob', '--yes', '--output-signature', signaturePath, artifactPath], {
        env: {
            ...process.env,
            COSIGN_EXPERIMENTAL: 'true',
            COSIGN_CERT_CHAIN: identity ?? process.env.COSIGN_CERT_CHAIN ?? '',
        },
        stdio: 'inherit',
    });
    return signaturePath;
}
function cosignVerifyArtifact(artifactPath, signaturePath) {
    try {
        (0, child_process_1.execFileSync)('cosign', ['verify-blob', '--signature', signaturePath, artifactPath], {
            env: { ...process.env, COSIGN_EXPERIMENTAL: 'true' },
            stdio: 'inherit',
        });
    }
    catch (error) {
        throw new Phase1GateError(`cosign verification failed for ${artifactPath}: ${String(error)}`);
    }
}
function buildDeterministicHmac(input, secret) {
    const key = secret ?? process.env.PHASE1_HMAC_SECRET ?? 'phase1-default-secret';
    return (0, crypto_1.createHmac)('sha256', key).update(input).digest('hex');
}
function cryptoRandomUuid() {
    const bytes = (0, crypto_1.randomBytes)(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}
