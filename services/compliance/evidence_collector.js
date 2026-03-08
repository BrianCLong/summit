"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvidence = createEvidence;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
// This function would write to your immutable audit_log table
// and ensure the event is anchored in the next Merkle root.
async function createEvidence(evidence) {
    console.log('Creating audit evidence:', evidence);
    await pg.query('INSERT INTO audit_log (tenant, action, subject, details) VALUES ($1, $2, $3, $4)', [evidence.tenant, evidence.action, evidence.subject, evidence.details]);
    console.log('Audit evidence created.');
}
