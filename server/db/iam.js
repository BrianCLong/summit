"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRdsAuthToken = buildRdsAuthToken;
async function buildRdsAuthToken(host, user) {
    // Placeholder: call AWS SDK RDS.Signer to create 15‑min token
    return `token-for-${user}@${host}`;
}
