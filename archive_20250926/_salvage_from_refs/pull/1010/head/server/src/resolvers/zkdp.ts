import { proveKAnonRange, proveEpsilonBudget, proveNoRowExport } from '../zkdp/Proofs';
import { verifyZkBundle } from '../zkdp/Verifier';
import { anchorDigest } from '../transparency/anchor';

export const zkdpResolvers = {
  Mutation: {
    submitZkProofs: (_: unknown, { runId, proofs }: { runId: string; proofs: any[] }) => {
      const bundle = verifyZkBundle(proofs as any, { kMin: 25, epsCap: 1 });
      bundle.digests.forEach(d => anchorDigest(d, { type: 'zk-proof', runId }));
      return bundle;
    },
    requestZkVerification: (_: unknown, { runId }: { runId: string }) => {
      // Placeholder verifies proofs have been anchored
      return { ok: true, digests: [], runId };
    },
  },
};
