import { ZkProof } from './Proofs';

export function verifyZkBundle(proofs: ZkProof[], req: { kMin: number; epsCap: number }) {
  const hasK = proofs.some(p => p.stmt.kObserved >= req.kMin);
  const epsOk = proofs.some(p => p.stmt.epsSpent <= req.epsCap);
  const noRow = proofs.some(p => p.stmt.noRowExport === true);
  if (!hasK || !epsOk || !noRow) throw new Error('zk_bundle_invalid');
  return { ok: true, digests: proofs.map(p => p.proofDigest) };
}
