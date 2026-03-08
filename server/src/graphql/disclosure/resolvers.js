"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosureResolvers = void 0;
const postgres_js_1 = require("../../db/postgres.js");
const sign_js_1 = require("../../claims/sign.js");
const bundle_js_1 = require("../../disclosure/bundle.js");
const retractions_js_1 = require("../../retractions.js");
const advisor_js_1 = require("../../advisor.js");
exports.disclosureResolvers = {
    Query: {
        claims: async (_, { runId }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { rows } = await pool.query(`SELECT cs.id, cs.run_id, cs.step_id, cs.merkle_root, cs.signature, cs.signer, cs.issued_at
         FROM claimset cs WHERE cs.run_id=$1 ORDER BY cs.issued_at DESC LIMIT 50`, [runId]);
            return rows.map((r) => ({
                id: r.id,
                runId: r.run_id,
                stepId: r.step_id,
                claims: [],
                merkleRoot: r.merkle_root,
                signature: r.signature,
            }));
        },
        retractions: async (_, { status }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const params = [];
            const where = status ? (params.push(status), `WHERE status=$1`) : '';
            const { rows } = await pool.query(`SELECT id, subject, reason, status, created_at FROM retraction ${where} ORDER BY created_at DESC LIMIT 200`, params);
            return rows.map((r) => ({
                id: r.id,
                subject: r.subject,
                reason: r.reason,
                status: r.status,
                createdAt: r.created_at,
                affectedBundles: [],
            }));
        },
        costAdvice: async (_, { runbookYaml }) => {
            return (0, advisor_js_1.advise)({ runbookYaml });
        },
    },
    Mutation: {
        publishDisclosure: async (_, { runId, stepId }) => {
            const payload = {
                id: `cs-${runId}-${stepId}`,
                runId,
                stepId,
                claims: [],
            };
            const { signature } = await (0, sign_js_1.signClaimSet)(process.env.TRANSIT_KEY || 'maestro-prov', payload);
            const { path, sha256 } = await (0, bundle_js_1.makeBundle)({
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
        retractSubject: async (_, { subject, reason }) => (0, retractions_js_1.enqueueRetraction)(subject, reason),
        verifyBundle: async () => true,
    },
};
