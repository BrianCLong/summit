"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csQuery = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const sdk_js_1 = require("./sdk.js");
const helpers_js_1 = require("../vault/helpers.js");
async function getToken() {
    const secret = await (0, helpers_js_1.vaultReadKvV2)('kv/data/plugins/crowdstrike');
    const clientId = secret?.data?.clientId || secret?.clientId || process.env.CS_CLIENT_ID;
    const clientSecret = secret?.data?.clientSecret ||
        secret?.clientSecret ||
        process.env.CS_CLIENT_SECRET;
    if (!clientId || !clientSecret)
        throw new Error('Missing CrowdStrike credentials');
    const res = await (0, node_fetch_1.default)('https://api.crowdstrike.com/oauth2/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    });
    if (!res.ok)
        throw new Error(`CrowdStrike token error ${res.status}`);
    const json = await res.json();
    return json.access_token;
}
exports.csQuery = (0, sdk_js_1.createPlugin)('crowdstrike.query', async (inputs, ctx) => {
    const { query } = inputs;
    const cacheKey = `cs:q:${Buffer.from(query).toString('base64url')}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached)
        return { data: cached, source: 'crowdstrike', fromCache: true };
    const token = await getToken();
    const url = `https://api.crowdstrike.com/intel/queries/indicators/v1?${new URLSearchParams({ filter: query })}`;
    const res = await (0, node_fetch_1.default)(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error(`CrowdStrike error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 600);
    return { data: json, source: 'crowdstrike' };
});
