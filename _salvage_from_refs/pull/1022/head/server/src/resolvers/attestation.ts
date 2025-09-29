import { AttestationVerifier, AttestReport } from '../tee/AttestationVerifier';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const policy = require('../../config/tee/policy.yaml');

const verifier = new AttestationVerifier(policy);
const statuses: Record<string, any> = {};

export const AttestationResolvers = {
  Query: {
    roomAttestation: (_: any, { roomId }: { roomId: string }) => statuses[roomId] || { roomId, ok: false, claims: {} },
  },
  Mutation: {
    verifyRoomAttestation: async (_: any, { roomId, report }: { roomId: string; report: AttestReport }) => {
      const result = await verifier.verify(report);
      const status = { roomId, ...result };
      statuses[roomId] = status;
      return status;
    },
  },
};
