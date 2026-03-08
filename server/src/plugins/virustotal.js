"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vtHashLookup = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const sdk_js_1 = require("./sdk.js");
const helpers_js_1 = require("../vault/helpers.js");
exports.vtHashLookup = (0, sdk_js_1.createPlugin)('virustotal.hash.lookup', async (inputs, ctx) => {
    const { hash } = inputs;
    const cacheKey = `vt:hash:${hash}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached)
        return { data: cached, source: 'virustotal', fromCache: true };
    const secret = await (0, helpers_js_1.vaultReadKvV2)('kv/data/plugins/virustotal');
    const apiKey = secret?.data?.apiKey || secret?.apiKey || process.env.VT_API_KEY;
    if (!apiKey)
        throw new Error('Missing VirusTotal apiKey');
    const url = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash)}`;
    const res = await (0, node_fetch_1.default)(url, { headers: { 'x-apikey': apiKey } });
    if (!res.ok)
        throw new Error(`VirusTotal error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 3600);
    return { data: json, source: 'virustotal' };
});
