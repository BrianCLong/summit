"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shodanIpLookup = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const sdk_js_1 = require("./sdk.js");
const helpers_js_1 = require("../vault/helpers.js");
exports.shodanIpLookup = (0, sdk_js_1.createPlugin)('shodan.ip.lookup', async (inputs, ctx) => {
    const { ip } = inputs;
    const cacheKey = `shodan:ip:${ip}`;
    const cached = await ctx.cache.get(cacheKey);
    if (cached)
        return { data: cached, source: 'shodan', fromCache: true };
    const secret = await (0, helpers_js_1.vaultReadKvV2)('kv/data/plugins/shodan');
    const apiKey = secret?.data?.apiKey || secret?.apiKey || process.env.SHODAN_API_KEY;
    if (!apiKey)
        throw new Error('Missing Shodan apiKey');
    const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}`;
    const res = await (0, node_fetch_1.default)(url);
    if (!res.ok)
        throw new Error(`Shodan error ${res.status}`);
    const json = await res.json();
    await ctx.cache.set(cacheKey, json, 3600);
    return { data: json, source: 'shodan' };
});
