// @ts-nocheck
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { referenceAdapters } from "./index";
import type { ReferenceAdapterDefinition } from "./types";

const defaultOutputDir = join(process.cwd(), "adapters/reference/dist");

export interface BundleSignature {
  algorithm: "ed25519";
  digest: string;
  signature: string;
  publicKey: string;
}

export interface BundleArtifact {
  adapter: string;
  bundlePath: string;
  signaturePath: string;
  signature: BundleSignature;
}

export interface SigningMaterial {
  privateKeyPem: string;
  publicKeyPem: string;
}

export function createSigningMaterial(inputKey?: string): SigningMaterial {
  if (inputKey) {
    const privateKey = createPrivateKey(inputKey);
    const publicKey = createPublicKey(privateKey);
    return {
      privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
      publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
  };
}

export function signPayload(
  payload: string,
  privateKeyPem: string,
  publicKeyPem: string
): BundleSignature {
  const digest = createHash("sha256").update(payload).digest("hex");
  const signatureBuffer = sign(null, Buffer.from(payload), createPrivateKey(privateKeyPem));

  return {
    algorithm: "ed25519",
    digest,
    signature: signatureBuffer.toString("base64"),
    publicKey: publicKeyPem,
  };
}

export function verifySignature(payload: string, bundleSignature: BundleSignature): boolean {
  return verify(
    null,
    Buffer.from(payload),
    createPublicKey(bundleSignature.publicKey),
    Buffer.from(bundleSignature.signature, "base64")
  );
}

function serializeAdapter(definition: ReferenceAdapterDefinition) {
  return {
    manifest: definition.manifest,
    configSchema: definition.configSchema,
    capabilities: definition.capabilities,
    fixtures: definition.fixtures,
    generatedAt: new Date().toISOString(),
  };
}

export function writeAdapterBundle(
  definition: ReferenceAdapterDefinition,
  outputDir: string,
  signingMaterial?: SigningMaterial
): BundleArtifact {
  mkdirSync(outputDir, { recursive: true });

  const keys = signingMaterial ?? createSigningMaterial();
  const payload = serializeAdapter(definition);
  const payloadString = `${JSON.stringify(payload, null, 2)}\n`;

  const signature = signPayload(payloadString, keys.privateKeyPem, keys.publicKeyPem);
  const bundlePath = join(outputDir, `${definition.manifest.name}.bundle.json`);
  const signaturePath = join(outputDir, `${definition.manifest.name}.signature.json`);

  writeFileSync(bundlePath, payloadString, "utf8");
  writeFileSync(
    signaturePath,
    `${JSON.stringify({ adapter: definition.manifest.name, signature }, null, 2)}\n`,
    "utf8"
  );

  return {
    adapter: definition.manifest.name,
    bundlePath,
    signaturePath,
    signature,
  };
}

export function buildReferenceBundles(options?: {
  outputDir?: string;
  signingKeyPath?: string;
  signingKeyPem?: string;
}) {
  const outputDir = options?.outputDir ?? defaultOutputDir;
  const signingKeyPem =
    options?.signingKeyPem ??
    (options?.signingKeyPath ? readFileSync(options.signingKeyPath, "utf8") : undefined);

  const signingMaterial = createSigningMaterial(signingKeyPem);
  const artifacts = referenceAdapters.map((adapter) =>
    writeAdapterBundle(adapter, outputDir, signingMaterial)
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    artifacts: artifacts.map((artifact) => ({
      adapter: artifact.adapter,
      bundlePath: artifact.bundlePath,
      signaturePath: artifact.signaturePath,
      digest: artifact.signature.digest,
    })),
  };

  writeFileSync(
    join(outputDir, "reference-adapters.manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  return artifacts;
}

if (process.argv[1] && process.argv[1].includes("packaging")) {
  const outDir = process.env.REFERENCE_ADAPTER_OUT_DIR ?? defaultOutputDir;
  const signingKeyPath = process.env.REFERENCE_ADAPTER_SIGNING_KEY;

  buildReferenceBundles({
    outputDir: outDir,
    signingKeyPath,
  });
}
