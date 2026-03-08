"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openIncident = openIncident;
exports.closeIncident = closeIncident;
const crypto_1 = require("crypto");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function openIncident({ runbook, tenant, severity, reason, details, }) {
    const id = (0, crypto_1.randomUUID)();
    await pg.query(`INSERT INTO incidents(id,runbook,tenant,severity,status,reason,details) VALUES ($1,$2,$3,$4,'OPEN',$5,$6)`, [id, runbook, tenant, severity, reason, details]);
    if (process.env.PAGERDUTY_URL)
        await (0, node_fetch_1.default)(process.env.PAGERDUTY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                summary: `${runbook} SLO breach`,
                severity,
                source: 'maestro',
                custom_details: details,
            }),
        });
    if (process.env.OPSGENIE_URL)
        await (0, node_fetch_1.default)(process.env.OPSGENIE_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                message: `${runbook} incident: ${reason}`,
                priority: severity,
            }),
        });
    if (process.env.SLACK_WEBHOOK)
        await (0, node_fetch_1.default)(process.env.SLACK_WEBHOOK, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                text: `🚨 Incident ${id} for ${runbook}: ${reason}`,
            }),
        });
    return id;
}
async function closeIncident(id) {
    await pg.query(`UPDATE incidents SET status='CLOSED', closed_at=now() WHERE id=$1`, [id]);
}
