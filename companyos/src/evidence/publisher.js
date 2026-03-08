"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvidence = publishEvidence;
const undici_1 = require("undici");
const sources_1 = require("./sources");
const MC_URL = process.env.MC_URL; // https://mc.prod/graphql
const MC_TOKEN = process.env.MC_TOKEN;
async function publishEvidence(releaseId, service = 'companyos', artifacts) {
    const slo = await (0, sources_1.readSloSnapshot)(service);
    const cost = await (0, sources_1.readUnitCosts)();
    const query = `mutation($input: EvidenceInput!){ publishEvidence(input:$input){ id releaseId createdAt } }`;
    const input = { releaseId, service, artifacts, slo, cost };
    const res = await (0, undici_1.request)(`${MC_URL}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MC_TOKEN}`,
        },
        body: JSON.stringify({ query, variables: { input } }),
    });
    if (res.statusCode >= 300)
        throw new Error(`publishEvidence HTTP ${res.statusCode}`);
    const body = await res.body.json();
    if (body.errors)
        throw new Error(`publishEvidence GQL ${JSON.stringify(body.errors)}`);
    return body.data.publishEvidence;
}
