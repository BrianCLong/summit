import { createHash, createVerify } from "node:crypto";
import { stableHash } from "@ga-graphai/data-integrity";
import type {
  EvidenceBundle,
  ExecutionAttestation,
  LedgerEntry,
  MerkleProofStep,
  PolicyDecisionToken,
  SnapshotCommitment,
} from "common-types";

const MERKLE_ALGORITHM = "sha256-merkle-v1";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function hashPair(left: string, right: string): string {
  return sha256Hex(`${left}${right}`);
}

function contentHash(entry: LedgerEntry): string {
  return stableHash(entry.payload ?? {});
}

function metadataHash(entry: LedgerEntry): string {
  return stableHash({
    id: entry.id,
    category: entry.category,
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    timestamp: entry.timestamp,
    previousHash: entry.previousHash ?? null,
    hash: entry.hash,
  });
}

function leafHash(content: string, meta: string): string {
  return hashPair(content, meta);
}

function buildProof(leaves: string[], index: number): MerkleProofStep[] {
  const proof: MerkleProofStep[] = [];
  let cursorIndex = index;
  let layer = [...leaves];

  while (layer.length > 1) {
    const isRightNode = cursorIndex % 2 === 1;
    const siblingIndex = isRightNode ? cursorIndex - 1 : cursorIndex + 1;
    const sibling = layer[siblingIndex] ?? layer[cursorIndex];
    proof.push({ position: isRightNode ? "left" : "right", hash: sibling });

    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    cursorIndex = Math.floor(cursorIndex / 2);
    layer = next;
  }

  return proof;
}

export function buildMerkleArtifacts(entries: readonly LedgerEntry[]): {
  atomIds: string[];
  contentHashes: Record<string, string>;
  metadataHashes: Record<string, string>;
  inclusionProofs: Record<string, MerkleProofStep[]>;
  merkleRoot: string;
} {
  const atomIds: string[] = [];
  const contentHashes: Record<string, string> = {};
  const metadataHashes: Record<string, string> = {};
  const leaves: string[] = [];

  entries.forEach((entry) => {
    const atomId = entry.id;
    const content = contentHash(entry);
    const meta = metadataHash(entry);
    atomIds.push(atomId);
    contentHashes[atomId] = content;
    metadataHashes[atomId] = meta;
    leaves.push(leafHash(content, meta));
  });

  if (leaves.length === 0) {
    return { atomIds, contentHashes, metadataHashes, inclusionProofs: {}, merkleRoot: "" };
  }

  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(hashPair(left, right));
    }
    layer = next;
  }

  const root = layer[0];
  const inclusionProofs: Record<string, MerkleProofStep[]> = {};
  leaves.forEach((_, index) => {
    inclusionProofs[atomIds[index]] = buildProof(leaves, index);
  });

  return { atomIds, contentHashes, metadataHashes, inclusionProofs, merkleRoot: root };
}

export function buildSnapshotCommitment(options: {
  merkleRoot: string;
  headHash?: string;
  signer?: string;
  publicKey?: string;
  signature?: string;
  issuedAt?: Date;
  algorithm?: string;
  redacted?: boolean;
}): SnapshotCommitment {
  const issuedAt = (options.issuedAt ?? new Date()).toISOString();
  const bundleHash = sha256Hex(`${options.merkleRoot}|${options.headHash ?? ""}`);
  return {
    merkleRoot: options.merkleRoot,
    headHash: options.headHash,
    algorithm: options.algorithm ?? MERKLE_ALGORITHM,
    issuedAt,
    bundleHash,
    signer: options.signer,
    signature: options.signature,
    publicKey: options.publicKey,
    redacted: options.redacted,
  };
}

export function derivePolicyDecisionTokens(
  entries: readonly LedgerEntry[],
  merkleRoot: string,
  issuedAt: Date = new Date()
): PolicyDecisionToken[] {
  const issuedAtIso = issuedAt.toISOString();
  const tokens: PolicyDecisionToken[] = [];

  entries.forEach((entry) => {
    const maybePolicyId =
      typeof entry.payload === "object" && entry.payload && "policyId" in entry.payload
        ? String((entry.payload as Record<string, unknown>).policyId)
        : undefined;
    if (entry.category === "policy" || maybePolicyId) {
      tokens.push({
        token: sha256Hex(`${entry.hash}|${merkleRoot}`),
        policyId: maybePolicyId,
        issuedAt: issuedAtIso,
        signer: entry.actor,
      });
    }
  });

  if (tokens.length === 0) {
    tokens.push({ token: sha256Hex(`${merkleRoot}|policy`), issuedAt: issuedAtIso });
  }

  return tokens;
}

export function buildExecutionAttestation(
  report: string,
  verified: boolean,
  issuedAt: Date,
  verifier?: string
): ExecutionAttestation {
  return {
    format: "verifiable-execution",
    report,
    verified,
    issuedAt: issuedAt.toISOString(),
    verifier,
  };
}

export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofStep[],
  expectedRoot: string
): boolean {
  let cursor = leaf;
  proof.forEach((step) => {
    cursor = step.position === "left" ? hashPair(step.hash, cursor) : hashPair(cursor, step.hash);
  });
  return cursor === expectedRoot;
}

export function verifySnapshotSignature(commitment: SnapshotCommitment): boolean {
  if (!commitment.signature || !commitment.publicKey) {
    return true;
  }
  const verifier = createVerify("SHA256");
  verifier.update(commitment.bundleHash ?? commitment.merkleRoot);
  verifier.end();
  return verifier.verify(commitment.publicKey, Buffer.from(commitment.signature, "base64"));
}

export function augmentEvidenceBundle(
  bundle: EvidenceBundle,
  entries: readonly LedgerEntry[],
  options: {
    signer?: string;
    publicKey?: string;
    signature?: string;
    issuedAt?: Date;
    redacted?: boolean;
  } = {}
): EvidenceBundle {
  const { atomIds, contentHashes, metadataHashes, inclusionProofs, merkleRoot } =
    buildMerkleArtifacts(entries);

  const snapshotCommitment = buildSnapshotCommitment({
    merkleRoot,
    headHash: bundle.headHash,
    signer: options.signer,
    publicKey: options.publicKey,
    signature: options.signature,
    issuedAt: options.issuedAt,
    redacted: options.redacted,
  });

  const policyDecisionTokens = derivePolicyDecisionTokens(
    entries,
    snapshotCommitment.merkleRoot,
    options.issuedAt ?? new Date()
  );

  return {
    ...bundle,
    atomIds,
    contentHashes,
    metadataHashes,
    inclusionProofs,
    snapshotCommitment,
    policyDecisionTokens,
  };
}
