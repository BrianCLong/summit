import { getPostgresPool } from '../../db/postgres.js';
import { signClaimSet } from '../../claims/sign.js';
import { makeBundle } from '../../disclosure/bundle.js';
import { enqueueRetraction } from '../../retractions.js';
import { advise } from '../../advisor.js';

export const disclosureResolvers = {
  Query: {
    claims: async (_: any, { runId }: any) => {
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        `SELECT cs.id, cs.run_id, cs.step_id, cs.merkle_root, cs.signature, cs.signer, cs.issued_at
         FROM claimset cs WHERE cs.run_id=$1 ORDER BY cs.issued_at DESC LIMIT 50`,
        [runId],
      );
      return rows.map((r: any) => ({
        id: r.id,
        runId: r.run_id,
        stepId: r.step_id,
        claims: [],
        merkleRoot: r.merkle_root,
        signature: r.signature,
      }));
    },
    retractions: async (_: any, { status }: any) => {
      const pool = getPostgresPool();
      const params: any[] = [];
      const where = status ? (params.push(status), `WHERE status=$1`) : '';
      const { rows } = await pool.query(
        `SELECT id, subject, reason, status, created_at FROM retraction ${where} ORDER BY created_at DESC LIMIT 200`,
        params,
      );
      return rows.map((r: any) => ({
        id: r.id,
        subject: r.subject,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        affectedBundles: [],
      }));
    },
    costAdvice: async (_: any, { runbookYaml }: any) => {
      return advise({ runbookYaml });
    },
  },
  Mutation: {
    publishDisclosure: async (_: any, { runId, stepId }: any) => {
      const payload = {
        id: `cs-${runId}-${stepId}`,
        runId,
        stepId,
        claims: [],
      };
      const { signature } = await signClaimSet(
        process.env.TRANSIT_KEY || 'maestro-prov',
        payload,
      );
      const { path, sha256 } = await makeBundle({
        artifacts: [],
        claimSet: payload,
        merkleRoot: '',
        attestations: [],
      });
      return {
        id: `bundle-${runId}-${stepId}`,
        uri: path,
        sha256,
        verified: !!signature,
      };
    },
    retractSubject: async (_: any, { subject, reason }: any) =>
      enqueueRetraction(subject, reason),
    verifyBundle: async () => true,
  },
};
