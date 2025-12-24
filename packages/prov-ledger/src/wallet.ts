import { createSign, createVerify } from 'crypto';
import { StepCommit, WalletManifest, SelectiveDisclosureBundle } from './types';
import { leafHash, buildMerkle, proofForLeaf, verifyProof } from './merkle';

export function signManifest(
  m: Omit<WalletManifest, 'signature'>,
  privatePem: string,
): WalletManifest {
  const signer = createSign('RSA-SHA256');
  signer.update(JSON.stringify(m));
  return { ...m, signature: signer.sign(privatePem, 'base64') };
}

export function verifyManifest(m: WalletManifest, publicPem: string): boolean {
  const v = createVerify('RSA-SHA256');
  const body = { ...m };
  delete (body as any).signature;
  v.update(JSON.stringify(body));
  return v.verify(publicPem, Buffer.from(m.signature, 'base64'));
}

// Build a full wallet from step commits
export function buildWallet(
  runId: string,
  caseId: string,
  steps: StepCommit[],
  privatePem: string,
  signerId = 'prov-ledger@intelgraph',
): { manifest: WalletManifest; leaves: string[]; steps: StepCommit[] } {
  const leaves = steps.map(leafHash);
  const { root, layers } = buildMerkle(leaves);
  const manifestUnsigned: Omit<WalletManifest, 'signature'> = {
    runId,
    caseId,
    createdAt: new Date().toISOString(),
    merkleRoot: root,
    signer: signerId,
    algo: 'RSA-SHA256',
  };
  const manifest = signManifest(manifestUnsigned, privatePem);
  return { manifest, leaves, steps };
}

// Selectively disclose a subset (by step ids) with inclusion proofs
export function disclose(
  selectStepIds: string[],
  manifest: WalletManifest,
  steps: StepCommit[],
  leaves: string[],
): SelectiveDisclosureBundle {
  const idToIndex = new Map(steps.map((s, i) => [s.id, i]));
  const { layers } = buildMerkle(leaves);
  const disclosed: StepCommit[] = [];
  const proofs = [];
  for (const sid of selectStepIds) {
    const idx = idToIndex.get(sid);
    if (idx === undefined) continue;
    disclosed.push(steps[idx]);
    const leaf = leaves[idx];
    proofs.push({ stepId: sid, leaf, path: proofForLeaf(idx, layers) });
  }
  return { manifest, disclosedSteps: disclosed, proofs };
}

// Verify a selective disclosure bundle
export function verifyDisclosure(
  b: SelectiveDisclosureBundle,
  publicPem: string,
): boolean {
  if (!verifyManifest(b.manifest, publicPem)) return false;
  for (let i = 0; i < b.disclosedSteps.length; i++) {
    const s = b.disclosedSteps[i];
    const pr = b.proofs.find((p) => p.stepId === s.id);
    if (!pr) return false;
    const leaf = leafHash(s);
    if (leaf !== pr.leaf) return false;
    if (!verifyProof(pr.leaf, pr.path, b.manifest.merkleRoot)) return false;
  }
  return true;
}
