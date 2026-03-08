"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSigningMaterial = createSigningMaterial;
exports.signPayload = signPayload;
exports.verifySignature = verifySignature;
exports.writeAdapterBundle = writeAdapterBundle;
exports.buildReferenceBundles = buildReferenceBundles;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const index_1 = require("./index");
const defaultOutputDir = (0, node_path_1.join)(process.cwd(), 'adapters/reference/dist');
function createSigningMaterial(inputKey) {
    if (inputKey) {
        const privateKey = (0, node_crypto_1.createPrivateKey)(inputKey);
        const publicKey = (0, node_crypto_1.createPublicKey)(privateKey);
        return {
            privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
            publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
        };
    }
    const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
    return {
        privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
        publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    };
}
function signPayload(payload, privateKeyPem, publicKeyPem) {
    const digest = (0, node_crypto_1.createHash)('sha256').update(payload).digest('hex');
    const signatureBuffer = (0, node_crypto_1.sign)(null, Buffer.from(payload), (0, node_crypto_1.createPrivateKey)(privateKeyPem));
    return {
        algorithm: 'ed25519',
        digest,
        signature: signatureBuffer.toString('base64'),
        publicKey: publicKeyPem,
    };
}
function verifySignature(payload, bundleSignature) {
    return (0, node_crypto_1.verify)(null, Buffer.from(payload), (0, node_crypto_1.createPublicKey)(bundleSignature.publicKey), Buffer.from(bundleSignature.signature, 'base64'));
}
function serializeAdapter(definition) {
    return {
        manifest: definition.manifest,
        configSchema: definition.configSchema,
        capabilities: definition.capabilities,
        fixtures: definition.fixtures,
        generatedAt: new Date().toISOString(),
    };
}
function writeAdapterBundle(definition, outputDir, signingMaterial) {
    (0, node_fs_1.mkdirSync)(outputDir, { recursive: true });
    const keys = signingMaterial ?? createSigningMaterial();
    const payload = serializeAdapter(definition);
    const payloadString = `${JSON.stringify(payload, null, 2)}\n`;
    const signature = signPayload(payloadString, keys.privateKeyPem, keys.publicKeyPem);
    const bundlePath = (0, node_path_1.join)(outputDir, `${definition.manifest.name}.bundle.json`);
    const signaturePath = (0, node_path_1.join)(outputDir, `${definition.manifest.name}.signature.json`);
    (0, node_fs_1.writeFileSync)(bundlePath, payloadString, 'utf8');
    (0, node_fs_1.writeFileSync)(signaturePath, `${JSON.stringify({ adapter: definition.manifest.name, signature }, null, 2)}\n`, 'utf8');
    return {
        adapter: definition.manifest.name,
        bundlePath,
        signaturePath,
        signature,
    };
}
function buildReferenceBundles(options) {
    const outputDir = options?.outputDir ?? defaultOutputDir;
    const signingKeyPem = options?.signingKeyPem ?? (options?.signingKeyPath ? (0, node_fs_1.readFileSync)(options.signingKeyPath, 'utf8') : undefined);
    const signingMaterial = createSigningMaterial(signingKeyPem);
    const artifacts = index_1.referenceAdapters.map((adapter) => writeAdapterBundle(adapter, outputDir, signingMaterial));
    const manifest = {
        generatedAt: new Date().toISOString(),
        artifacts: artifacts.map((artifact) => ({
            adapter: artifact.adapter,
            bundlePath: artifact.bundlePath,
            signaturePath: artifact.signaturePath,
            digest: artifact.signature.digest,
        })),
    };
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outputDir, 'reference-adapters.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return artifacts;
}
if (process.argv[1] && process.argv[1].includes('packaging')) {
    const outDir = process.env.REFERENCE_ADAPTER_OUT_DIR ?? defaultOutputDir;
    const signingKeyPath = process.env.REFERENCE_ADAPTER_SIGNING_KEY;
    buildReferenceBundles({
        outputDir: outDir,
        signingKeyPath,
    });
}
