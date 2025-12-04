import {
  randomUUID,
  createHash,
  generateKeyPairSync,
  sign,
  verify,
} from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'prov-ledger' });

export interface Evidence {
  id: string;
  contentHash: string;
  licenseId: string;
  source: string;
  transforms: string[];
  timestamp: Date;
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  text: string;
  confidence: number;
  links: string[];
  hash: string;
  signature: string;
  publicKey: string;
  timestamp: Date;
}

const evidenceStore = new Map<string, Evidence>();
const claimStore = new Map<string, Claim>();

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

export function registerEvidence(input: Omit<Evidence, 'id' | 'timestamp'>): Evidence {
  const id = randomUUID();
  const evid: Evidence = { id, ...input, timestamp: new Date() };
  evidenceStore.set(id, evid);
  return evid;
}

export function createClaim(
  input: Omit<Claim, 'id' | 'hash' | 'signature' | 'publicKey' | 'timestamp'>,
): Claim {
  const id = randomUUID();
  const hash = createHash('sha256').update(input.text).digest('hex');
  const sig = sign(null, Buffer.from(hash, 'hex'), privateKey).toString(
    'base64',
  );
  const claim: Claim = {
    id,
    ...input,
    hash,
    signature: sig,
    publicKey: publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    timestamp: new Date(),
  };
  claimStore.set(id, claim);
  return claim;
}

export function getClaim(id: string): Claim | undefined {
  return claimStore.get(id);
}

export function getEvidence(id: string): Evidence | undefined {
  return evidenceStore.get(id);
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let nodes: Buffer[] = hashes.map((h) => Buffer.from(h, 'hex')) as Buffer[];
  while (nodes.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        next.push(
          createHash('sha256')
            .update(Buffer.concat([nodes[i], nodes[i + 1]]))
            .digest(),
        );
      } else {
        next.push(nodes[i]);
      }
    }
    nodes = next;
  }
  return nodes[0].toString('hex');
}

export interface ManifestClaim {
  id: string;
  text: string;
  hash: string;
  signature: string;
  publicKey: string;
}

export interface Manifest {
  merkleRoot: string;
  licenses: string[];
  claims: ManifestClaim[];
}

export function buildManifest(claimIds: string[]): Manifest {
  const claims: ManifestClaim[] = [];
  const licenses = new Set<string>();
  const hashes: string[] = [];
  for (const cid of claimIds) {
    const claim = claimStore.get(cid);
    if (!claim) continue;
    hashes.push(claim.hash);
    claims.push({
      id: claim.id,
      text: claim.text,
      hash: claim.hash,
      signature: claim.signature,
      publicKey: claim.publicKey,
    });
    for (const evidId of claim.evidenceIds) {
      const evid = evidenceStore.get(evidId);
      if (evid) licenses.add(evid.licenseId);
    }
  }
  return {
    merkleRoot: merkleRoot(hashes),
    licenses: Array.from(licenses),
    claims,
  };
}

export interface LicenseCheck {
  valid: boolean;
  reason?: string;
  appealCode?: string;
}

const incompatibleLicenses = new Map<
  string,
  { reason: string; appealCode: string }
>([
  [
    'GPL-3.0',
    {
      reason: 'GPL-3.0 license is incompatible with export policy',
      appealCode: 'LIC001',
    },
  ],
]);

export function checkLicenses(licenses: string[]): LicenseCheck {
  for (const lic of licenses) {
    const info = incompatibleLicenses.get(lic);
    if (info) {
      return { valid: false, ...info };
    }
  }
  return { valid: true };
}

export function verifyClaim(manifestClaim: ManifestClaim): boolean {
  const hash = createHash('sha256').update(manifestClaim.text).digest('hex');
  if (hash !== manifestClaim.hash) return false;
  return verify(
    null,
    Buffer.from(hash, 'hex'),
    {
      key: Buffer.from(manifestClaim.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    },
    Buffer.from(manifestClaim.signature, 'base64'),
  );
}

// Transform tracking for provenance chain
export interface Transform {
  id: string;
  inputIds: string[];
  outputId: string;
  operation: string;
  parameters?: Record<string, any>;
  timestamp: Date;
  actor?: string;
}

export interface ProvenanceChain {
  id: string;
  type: 'evidence' | 'claim';
  source: Evidence | Claim;
  transforms: Transform[];
  derivedFrom: string[];
  confidence?: number;
  lineage: ProvenanceNode[];
}

export interface ProvenanceNode {
  id: string;
  type: 'evidence' | 'claim' | 'transform';
  parentIds: string[];
  metadata: Record<string, any>;
  timestamp: Date;
}

const transformStore = new Map<string, Transform>();
const provenanceStore = new Map<string, ProvenanceChain>();

export function recordTransform(input: Omit<Transform, 'id'>): Transform {
  const id = randomUUID();
  const transform: Transform = { id, ...input };
  transformStore.set(id, transform);

  // Update provenance chains for outputs
  updateProvenanceChain(input.outputId, transform);

  logger.info(
    {
      transformId: id,
      operation: input.operation,
      inputCount: input.inputIds.length,
      outputId: input.outputId,
    },
    'Transform recorded',
  );

  return transform;
}

function updateProvenanceChain(outputId: string, transform: Transform): void {
  const chain = provenanceStore.get(outputId) || {
    id: outputId,
    type: claimStore.has(outputId) ? ('claim' as const) : ('evidence' as const),
    source: claimStore.get(outputId) || evidenceStore.get(outputId)!,
    transforms: [],
    derivedFrom: [],
    lineage: [],
  };

  chain.transforms.push(transform);
  chain.derivedFrom.push(...transform.inputIds);

  // Build lineage tree
  const lineageNode: ProvenanceNode = {
    id: transform.id,
    type: 'transform',
    parentIds: transform.inputIds,
    metadata: {
      operation: transform.operation,
      parameters: transform.parameters || {},
    },
    timestamp: transform.timestamp,
  };

  chain.lineage.push(lineageNode);
  provenanceStore.set(outputId, chain);
}

export function getProvenance(id: string): ProvenanceChain | null {
  const existing = provenanceStore.get(id);
  if (existing) {
    return existing;
  }

  // Create basic provenance for existing evidence/claims
  const evidence = evidenceStore.get(id);
  const claim = claimStore.get(id);

  if (evidence) {
    const chain: ProvenanceChain = {
      id,
      type: 'evidence',
      source: evidence,
      transforms: [],
      derivedFrom: [],
      lineage: [
        {
          id: evidence.id,
          type: 'evidence',
          parentIds: [],
          metadata: {
            source: evidence.source,
            licenseId: evidence.licenseId,
            contentHash: evidence.contentHash,
          },
          timestamp: evidence.timestamp,
        },
      ],
    };
    provenanceStore.set(id, chain);
    return chain;
  }

  if (claim) {
    const chain: ProvenanceChain = {
      id,
      type: 'claim',
      source: claim,
      transforms: [],
      derivedFrom: claim.evidenceIds,
      confidence: claim.confidence,
      lineage: [
        {
          id: claim.id,
          type: 'claim',
          parentIds: claim.evidenceIds,
          metadata: {
            text: claim.text,
            confidence: claim.confidence,
            hash: claim.hash,
          },
          timestamp: claim.timestamp,
        },
      ],
    };
    provenanceStore.set(id, chain);
    return chain;
  }

  return null;
}

// Enhanced license checking with policy simulation
export interface PolicyContext {
  userId: string;
  tenantId: string;
  purpose: string;
  exportType: 'analysis' | 'report' | 'dataset' | 'api';
  destination?: string;
}

export interface EnhancedLicenseCheck {
  valid: boolean;
  reason?: string;
  appealCode?: string;
  appealUrl?: string;
  policyDecision: {
    action: 'allow' | 'deny' | 'review';
    reasons: string[];
    requiredApprovals?: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

export function checkLicensesWithContext(
  licenses: string[],
  context: PolicyContext,
): EnhancedLicenseCheck {
  // Start with basic license check
  const basicCheck = checkLicenses(licenses);

  // Enhanced policy evaluation
  const riskFactors: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check for restrictive licenses
  const restrictiveLicenses = licenses.filter((l) =>
    ['GPL-3.0', 'AGPL-3.0', 'CC-BY-NC'].includes(l),
  );

  if (restrictiveLicenses.length > 0) {
    riskFactors.push(`Restrictive licenses: ${restrictiveLicenses.join(', ')}`);
    riskLevel = 'medium';
  }

  // Check export type and destination
  if (
    context.exportType === 'dataset' &&
    context.destination?.includes('external')
  ) {
    riskFactors.push('External dataset export requires additional review');
    riskLevel = 'high';
  }

  // Commercial vs research purpose
  if (context.purpose === 'commercial' && restrictiveLicenses.length > 0) {
    riskFactors.push('Commercial use with restrictive licenses');
    riskLevel = 'high';
  }

  let policyAction: 'allow' | 'deny' | 'review' = 'allow';
  const policyReasons: string[] = [];

  if (!basicCheck.valid) {
    policyAction = 'deny';
    policyReasons.push(basicCheck.reason || 'License incompatibility');
  } else if (riskLevel === 'high') {
    policyAction = 'review';
    policyReasons.push('High-risk export requires manual review');
  } else if (riskLevel === 'medium' && context.exportType === 'dataset') {
    policyAction = 'review';
    policyReasons.push('Medium-risk dataset export requires review');
  }

  return {
    valid: policyAction === 'allow',
    reason: basicCheck.reason,
    appealCode: basicCheck.appealCode,
    appealUrl: basicCheck.appealCode
      ? `https://compliance.intelgraph.io/appeal/${basicCheck.appealCode}`
      : undefined,
    policyDecision: {
      action: policyAction,
      reasons: policyReasons,
      requiredApprovals:
        policyAction === 'review' ? ['compliance-officer'] : undefined,
    },
    riskAssessment: {
      level: riskLevel,
      factors: riskFactors,
    },
  };
}

// Hash tree operations for efficient verification
export interface HashTreeNode {
  hash: string;
  left?: HashTreeNode;
  right?: HashTreeNode;
  data?: string;
}

export function buildHashTree(hashes: string[]): HashTreeNode | null {
  if (hashes.length === 0) return null;

  let nodes: HashTreeNode[] = hashes.map((hash) => ({ hash, data: hash }));

  while (nodes.length > 1) {
    const nextLevel: HashTreeNode[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : left;

      const combined = Buffer.concat([
        Buffer.from(left.hash, 'hex'),
        Buffer.from(right.hash, 'hex'),
      ]);

      const parentHash = createHash('sha256').update(combined).digest('hex');

      nextLevel.push({
        hash: parentHash,
        left,
        right: right !== left ? right : undefined,
      });
    }

    nodes = nextLevel;
  }

  return nodes[0];
}

export function getHashTreeProof(
  tree: HashTreeNode,
  targetHash: string,
): string[] | null {
  const proof: string[] = [];

  function findPath(node: HashTreeNode, target: string): boolean {
    if (node.data === target) {
      return true;
    }

    if (!node.left && !node.right) {
      return false;
    }

    if (node.left && findPath(node.left, target)) {
      if (node.right) proof.push(node.right.hash);
      return true;
    }

    if (node.right && findPath(node.right, target)) {
      if (node.left) proof.push(node.left.hash);
      return true;
    }

    return false;
  }

  return findPath(tree, targetHash) ? proof : null;
}

export function verifyHashTreeProof(
  targetHash: string,
  proof: string[],
  rootHash: string,
): boolean {
  let currentHash = targetHash;

  for (const proofHash of proof) {
    const combined = Buffer.concat([
      Buffer.from(currentHash, 'hex'),
      Buffer.from(proofHash, 'hex'),
    ]);
    currentHash = createHash('sha256').update(combined).digest('hex');
  }

  return currentHash === rootHash;
}
