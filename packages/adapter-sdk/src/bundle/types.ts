export interface AdapterRuntimeTarget {
  os: string;
  arch: string;
  node: string;
  features?: string[];
  constraints?: string[];
}

export interface AdapterCompatibilityMatrix {
  sdk: {
    min: string;
    max?: string;
  };
  runtimes: AdapterRuntimeTarget[];
  capabilities?: string[];
  dependencies?: Record<string, string>;
  notes?: string;
}

export interface AdapterArtifacts {
  payload: string;
  sbom: string;
  slsa: string;
  configSchema: string;
  compatibility: string;
}

export interface AdapterManifest {
  $schema?: string;
  id: string;
  name: string;
  version: string;
  description?: string;
  sdkVersion: string;
  entrypoint: string;
  createdAt: string;
  maintainer?: {
    name: string;
    email?: string;
  };
  compatibility: AdapterCompatibilityMatrix;
  artifacts: AdapterArtifacts;
  checksums: {
    payload: string;
    sbom: string;
    slsa: string;
    configSchema: string;
  };
  metadata?: Record<string, unknown>;
}

export interface BundleBuildOptions {
  manifest: Omit<AdapterManifest, "artifacts" | "checksums" | "compatibility" | "createdAt"> & {
    createdAt?: string;
  };
  compatibility: AdapterCompatibilityMatrix;
  sourceDir: string;
  configSchemaPath: string;
  outputDir?: string;
  sbomPath?: string;
  slsaPath?: string;
  cosignBinary?: string;
  signingKeyPath: string;
}

export interface BundleBuildResult {
  bundlePath: string;
  signaturePath: string;
  manifest: AdapterManifest;
  bundleDigest: string;
}

export interface BundleVerificationOptions {
  bundlePath: string;
  signaturePath: string;
  publicKeyPath: string;
  expectedSdkVersion: string;
  cosignBinary?: string;
  allowPrerelease?: boolean;
}

export interface BundleVerificationResult {
  verified: boolean;
  manifest: AdapterManifest;
  compatibility: AdapterCompatibilityMatrix;
  bundleDigest: string;
  diagnostics: string[];
}

export class BundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleValidationError";
  }
}
