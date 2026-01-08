import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import { buildMerkleRoot, hashLeaf, sha256File } from "./hash.js";
import {
  BundleManifest,
  CheckResult,
  ClaimRecord,
  EvidenceRecord,
  TransformStep,
  VerificationReport,
} from "./types.js";

interface LoadedBundle {
  basePath: string;
  manifestPath: string;
  cleanup: () => Promise<void>;
}

export async function verifyBundle(bundlePath: string): Promise<VerificationReport> {
  const bundle = await loadBundle(bundlePath);
  try {
    const manifest = await loadManifest(bundle.manifestPath);

    const manifestStructure = validateManifest(manifest);
    const evidenceResult = await verifyEvidence(manifest, bundle.basePath);
    const transformChains = verifyTransformChains(manifest, evidenceResult.calculatedHashes);
    const hashTree = verifyHashTree(manifest, evidenceResult.calculatedHashes);
    const claimReferences = verifyClaims(manifest, evidenceResult.presentEvidenceIds);

    const ok =
      manifestStructure.ok &&
      evidenceResult.check.ok &&
      hashTree.ok &&
      transformChains.ok &&
      claimReferences.ok;

    const report: VerificationReport = {
      ok,
      bundlePath,
      manifestPath: bundle.manifestPath,
      manifest,
      checks: {
        manifestStructure,
        evidenceHashes: evidenceResult.check,
        hashTree,
        transformChains,
        claimReferences,
      },
      summary: {
        evidenceCount: manifest?.evidence?.length ?? 0,
        claimCount: manifest?.claims?.length ?? 0,
        missingEvidence: evidenceResult.missingEvidence,
        hashMismatches: evidenceResult.hashMismatches,
      },
    };

    return report;
  } finally {
    await bundle.cleanup();
  }
}

async function loadBundle(bundlePath: string): Promise<LoadedBundle> {
  const stats = await fsp.stat(bundlePath).catch(() => null);
  if (!stats) {
    throw new Error(`Bundle not found at path: ${bundlePath}`);
  }

  if (stats.isDirectory()) {
    const manifestPath = path.join(bundlePath, "manifest.json");
    return {
      basePath: bundlePath,
      manifestPath,
      cleanup: async () => {},
    };
  }

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "prov-ledger-bundle-"));
  const zip = new AdmZip(bundlePath);
  zip.extractAllTo(tmpDir, true);
  const manifestPath = path.join(tmpDir, "manifest.json");
  return {
    basePath: tmpDir,
    manifestPath,
    cleanup: async () => fsp.rm(tmpDir, { recursive: true, force: true }),
  };
}

async function loadManifest(manifestPath: string): Promise<BundleManifest> {
  const exists = await fsp
    .access(manifestPath, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new Error(`manifest.json not found in bundle (looked at ${manifestPath})`);
  }

  const content = await fsp.readFile(manifestPath, "utf8");
  return JSON.parse(content) as BundleManifest;
}

function buildCheck(name: string, ok: boolean, errors: string[], warnings: string[]): CheckResult {
  return { name, ok, errors, warnings };
}

function validateManifest(manifest: BundleManifest): CheckResult {
  const errors: string[] = [];
  if (!manifest) {
    errors.push("Manifest is missing or unreadable");
    return buildCheck("Manifest structure", false, errors, []);
  }

  if (!manifest.bundleId) errors.push("bundleId is required");
  if (!manifest.version) errors.push("version is required");
  if (!manifest.generatedAt) errors.push("generatedAt is required");
  if (manifest.hashAlgorithm !== "sha256") {
    errors.push(`hashAlgorithm must be "sha256" (got "${manifest.hashAlgorithm}")`);
  }

  if (!Array.isArray(manifest.evidence) || manifest.evidence.length === 0) {
    errors.push("evidence array is required and cannot be empty");
  } else {
    manifest.evidence.forEach((evidence) => {
      if (!evidence.id) errors.push("evidence.id is required");
      if (!evidence.path) errors.push(`evidence ${evidence.id} missing path`);
      if (!evidence.sha256) errors.push(`evidence ${evidence.id} missing sha256`);
      if (!Array.isArray(evidence.transforms) || evidence.transforms.length === 0) {
        errors.push(`evidence ${evidence.id} missing transform chain`);
      }
    });
  }

  return buildCheck("Manifest structure", errors.length === 0, errors, []);
}

async function verifyEvidence(
  manifest: BundleManifest,
  basePath: string
): Promise<{
  check: CheckResult;
  missingEvidence: string[];
  hashMismatches: string[];
  calculatedHashes: Map<string, string>;
  presentEvidenceIds: Set<string>;
}> {
  const missingEvidence: string[] = [];
  const hashMismatches: string[] = [];
  const calculatedHashes = new Map<string, string>();
  const presentEvidenceIds = new Set<string>();

  if (!manifest?.evidence) {
    return {
      check: buildCheck("Evidence hashes", false, ["Manifest missing evidence entries"], []),
      missingEvidence,
      hashMismatches,
      calculatedHashes,
      presentEvidenceIds,
    };
  }

  for (const evidence of manifest.evidence) {
    const resolvedPath = path.join(basePath, evidence.path);
    const exists = await fsp
      .access(resolvedPath, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      missingEvidence.push(evidence.id);
      continue;
    }

    presentEvidenceIds.add(evidence.id);
    const actualHash = await sha256File(resolvedPath);
    calculatedHashes.set(evidence.id, actualHash);
    if (actualHash !== evidence.sha256) {
      hashMismatches.push(`${evidence.id} (expected ${evidence.sha256}, got ${actualHash})`);
    }
  }

  const ok = missingEvidence.length === 0 && hashMismatches.length === 0;
  return {
    check: buildCheck(
      "Evidence hashes",
      ok,
      [...missingEvidence.map((m) => `Missing evidence file for ${m}`), ...hashMismatches],
      []
    ),
    missingEvidence,
    hashMismatches,
    calculatedHashes,
    presentEvidenceIds,
  };
}

function verifyTransformChains(
  manifest: BundleManifest,
  calculatedHashes: Map<string, string>
): CheckResult {
  const errors: string[] = [];

  for (const evidence of manifest?.evidence ?? []) {
    const chainErrors = validateTransformChain(evidence, calculatedHashes.get(evidence.id));
    errors.push(...chainErrors);
  }

  return buildCheck("Transform chains", errors.length === 0, errors, []);
}

function validateTransformChain(evidence: EvidenceRecord, finalHash?: string): string[] {
  const errors: string[] = [];
  if (!evidence.transforms || evidence.transforms.length === 0) {
    errors.push(`Evidence ${evidence.id} is missing transforms`);
    return errors;
  }

  evidence.transforms.forEach((step, index) => {
    if (!step.type) errors.push(`Transform ${step.id || index} missing type`);
    if (!step.actor) errors.push(`Transform ${step.id || index} missing actor`);
    if (!step.timestamp) errors.push(`Transform ${step.id || index} missing timestamp`);
    if (!step.outputHash) errors.push(`Transform ${step.id || index} missing outputHash`);

    const parsed = Date.parse(step.timestamp);
    if (Number.isNaN(parsed)) {
      errors.push(`Transform ${step.id || index} has invalid timestamp`);
    }

    if (index > 0) {
      const prev = evidence.transforms[index - 1]!;
      if (step.inputHash && prev.outputHash && step.inputHash !== prev.outputHash) {
        errors.push(
          `Transform ${step.id || index} inputHash does not match previous output for evidence ${evidence.id}`
        );
      }
      const prevTime = Date.parse(prev.timestamp);
      if (!Number.isNaN(parsed) && parsed < prevTime) {
        errors.push(`Transforms for ${evidence.id} are not chronological around ${step.id}`);
      }
    }
  });

  const last = evidence.transforms[evidence.transforms.length - 1];
  if (finalHash && last?.outputHash && finalHash !== last.outputHash) {
    errors.push(
      `Final transform outputHash for ${evidence.id} (${last.outputHash}) does not match content hash (${finalHash})`
    );
  }

  return errors;
}

function verifyHashTree(
  manifest: BundleManifest,
  calculatedHashes: Map<string, string>
): CheckResult {
  const errors: string[] = [];

  if (!manifest.hashTree) {
    errors.push("hashTree is missing from manifest");
    return buildCheck("Hash tree", false, errors, []);
  }

  if (!manifest.hashTree.root) {
    errors.push("hashTree.root is missing");
  }

  if (manifest.hashTree.algorithm !== "sha256") {
    errors.push("hashTree.algorithm must be sha256");
  }

  const leaves = manifest.evidence
    .map((e) => {
      const actualHash = calculatedHashes.get(e.id) ?? e.sha256;
      return { id: e.id, hash: actualHash };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const leafHashes = leaves.map((leaf) => hashLeaf(leaf.id, leaf.hash));
  const { root } = buildMerkleRoot(leafHashes);

  if (manifest.hashTree.root !== root) {
    errors.push(`Merkle root mismatch (expected ${manifest.hashTree.root}, calculated ${root})`);
  }

  if (manifest.hashTree.leaves?.length !== manifest.evidence.length) {
    errors.push("hashTree.leaves count does not match evidence count");
  }

  return buildCheck("Hash tree", errors.length === 0, errors, []);
}

function verifyClaims(manifest: BundleManifest, evidenceIds: Set<string>): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest.claims || manifest.claims.length === 0) {
    warnings.push("No claims found in manifest");
    return buildCheck("Claim references", errors.length === 0, errors, warnings);
  }

  for (const claim of manifest.claims) {
    errors.push(...validateClaim(claim, evidenceIds));
  }

  return buildCheck("Claim references", errors.length === 0, errors, warnings);
}

function validateClaim(claim: ClaimRecord, evidenceIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!claim.id) errors.push("Claim missing id");
  if (!Array.isArray(claim.evidenceIds) || claim.evidenceIds.length === 0) {
    errors.push(`Claim ${claim.id || "<unknown>"} missing evidenceIds`);
    return errors;
  }

  for (const eid of claim.evidenceIds) {
    if (!evidenceIds.has(eid)) {
      errors.push(`Claim ${claim.id} references missing evidence ${eid}`);
    }
  }

  return errors;
}
