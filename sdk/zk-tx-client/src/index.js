"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZkTxClient = void 0;
exports.pedersenMiMCStubCommitment = pedersenMiMCStubCommitment;
exports.buildTenantCommitment = buildTenantCommitment;
const buffer_1 = require("buffer");
const blake3_1 = require("blake3");
function pedersenMiMCStubCommitment(selector, salt) {
    const prefix = buffer_1.Buffer.from('pedersen-mimc-stub');
    const payload = buffer_1.Buffer.concat([prefix, buffer_1.Buffer.from(salt), buffer_1.Buffer.from(selector)]);
    const digest = (0, blake3_1.hash)(payload);
    return buffer_1.Buffer.from(digest).toString('hex');
}
class ZkTxClient {
    baseUrl;
    fetchImpl;
    constructor(baseUrl, fetchImpl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        const globalFetch = globalThis.fetch;
        this.fetchImpl = fetchImpl ?? globalFetch;
        if (!this.fetchImpl) {
            throw new Error('fetch implementation required for ZkTxClient');
        }
    }
    async overlapProof(request) {
        const payload = {
            tenant_a: {
                commitments: request.tenantA.commitments.slice(),
            },
            tenant_b: {
                commitments: request.tenantB.commitments.slice(),
            },
        };
        if (request.circuitHint) {
            payload.circuit_hint = request.circuitHint;
        }
        if (typeof request.redTeam === 'boolean') {
            payload.red_team = request.redTeam;
        }
        const response = await this.fetchImpl(`${this.baseUrl}/overlap-proof`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`zk-tx-svc error: ${message}`);
        }
        const result = await response.json();
        const redTeamReport = result.red_team_report
            ? {
                success: Boolean(result.red_team_report.success),
                message: String(result.red_team_report.message),
            }
            : undefined;
        return {
            overlap: Boolean(result.overlap),
            proof: String(result.proof),
            circuit: String(result.circuit),
            proofSize: Number(result.proof_size),
            redTeamReport,
        };
    }
}
exports.ZkTxClient = ZkTxClient;
function buildTenantCommitment(selectors, tenantLabel) {
    const commitments = selectors.map((selector, index) => pedersenMiMCStubCommitment(selector, `${tenantLabel}-${index}`));
    return { commitments };
}
