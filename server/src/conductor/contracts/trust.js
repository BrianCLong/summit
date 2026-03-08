"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTrustContract = verifyTrustContract;
exports.upsertTrustContract = upsertTrustContract;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function verifyTrustContract(tc) {
    if (new Date(tc.expiresAt) < new Date())
        throw new Error('contract expired');
    // TODO: Verify signature against provider's registered key (PKI/cosign)
    return true;
}
async function upsertTrustContract(tc) {
    await verifyTrustContract(tc);
    await pg.query(`INSERT INTO trust_contracts(id, provider, consumer, scope, residency, expires_at, signature)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     ON CONFLICT (provider, consumer, signature) DO NOTHING`, [
        tc.providerTenant,
        tc.consumerTenant,
        tc.scope,
        tc.residency,
        tc.expiresAt,
        tc.signature,
    ]);
}
