"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSecret = void 0;
const node_vault_1 = __importDefault(require("node-vault"));
const securityLogger_js_1 = require("../observability/securityLogger.js");
const vaultAddr = process.env.VAULT_ADDR;
const vaultToken = process.env.VAULT_TOKEN;
const vaultSecretPath = process.env.VAULT_SECRET_PATH || 'secret/data/drop-gateway';
const client = vaultAddr && vaultToken
    ? (0, node_vault_1.default)({ endpoint: vaultAddr, token: vaultToken, requestOptions: { json: true } })
    : undefined;
const cache = {};
const fetchSecret = async (key, fallback) => {
    if (cache[key])
        return cache[key];
    if (!client)
        return fallback;
    try {
        const result = await client.read(vaultSecretPath);
        const secretValue = result?.data?.data?.[key];
        if (secretValue) {
            cache[key] = secretValue;
            return secretValue;
        }
        return fallback;
    }
    catch (error) {
        securityLogger_js_1.securityLogger.logEvent('vault_error', {
            level: 'warn',
            message: error?.message || 'Unknown Vault error',
        });
        return fallback;
    }
};
exports.fetchSecret = fetchSecret;
