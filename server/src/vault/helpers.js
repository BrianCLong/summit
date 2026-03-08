"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaultReadKvV2 = vaultReadKvV2;
exports.vaultTransitSign = vaultTransitSign;
exports.vaultDbCreds = vaultDbCreds;
const node_fetch_1 = __importDefault(require("node-fetch"));
const VAULT_ADDR = process.env.VAULT_ADDR || '';
const VAULT_TOKEN = process.env.VAULT_TOKEN || '';
async function vfetch(path, init) {
    const url = `${VAULT_ADDR}${path.startsWith('/v1') ? path : '/v1' + path}`;
    const res = await (0, node_fetch_1.default)(url, {
        ...(init || {}),
        headers: {
            'X-Vault-Token': VAULT_TOKEN,
            'content-type': 'application/json',
            ...(init?.headers || {}),
        },
    });
    if (!res.ok)
        throw new Error(`Vault error ${res.status}`);
    return res.json();
}
async function vaultReadKvV2(path) {
    const j = await vfetch(`/v1/${path.startsWith('kv/') ? path : 'kv/' + path}`);
    return j.data?.data ?? j.data;
}
async function vaultTransitSign(key, base64Input) {
    const j = await vfetch(`/v1/transit/sign/${key}`, {
        method: 'POST',
        body: JSON.stringify({ input: base64Input }),
    });
    return j.data?.signature;
}
async function vaultDbCreds(role) {
    const j = await vfetch(`/v1/database/creds/${role}`);
    return {
        username: j.data?.username,
        password: j.data?.password,
        ttl: j.lease_duration,
    };
}
