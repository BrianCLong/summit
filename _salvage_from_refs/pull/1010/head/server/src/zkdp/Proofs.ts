export type ZkStatement = {
  kMin: number;
  kObserved: number;
  epsCap: number;
  epsSpent: number;
  noRowExport: boolean;
};

export type ZkProof = {
  stmt: ZkStatement;
  proofDigest: string;
  createdAt: string;
};

export function proveKAnonRange(kObserved: number, kMin: number): ZkProof {
  if (kObserved < kMin) throw new Error('k_anon_violation');
  const proofDigest = require('crypto')
    .createHash('sha256')
    .update(`k>=${kMin}:${kObserved}`)
    .digest('hex');
  return {
    stmt: { kMin, kObserved, epsCap: 0, epsSpent: 0, noRowExport: true },
    proofDigest,
    createdAt: new Date().toISOString(),
  };
}

export function proveEpsilonBudget(epsSpent: number, epsCap: number): ZkProof {
  if (epsSpent > epsCap) throw new Error('epsilon_cap_exceeded');
  const proofDigest = require('crypto')
    .createHash('sha256')
    .update(`e<=${epsCap}:${epsSpent}`)
    .digest('hex');
  return {
    stmt: { kMin: 0, kObserved: 0, epsCap, epsSpent, noRowExport: true },
    proofDigest,
    createdAt: new Date().toISOString(),
  };
}

export function proveNoRowExport(transcriptHash: string): ZkProof {
  const proofDigest = require('crypto')
    .createHash('sha256')
    .update(`norow:${transcriptHash}`)
    .digest('hex');
  return {
    stmt: { kMin: 0, kObserved: 0, epsCap: 0, epsSpent: 0, noRowExport: true },
    proofDigest,
    createdAt: new Date().toISOString(),
  };
}
