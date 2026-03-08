"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInbound = handleInbound;
const afl_store_1 = require("@intelgraph/afl-store");
const tariff_js_1 = require("../middleware/tariff.js");
const store = new afl_store_1.AFLStore(process.env.AFL_REDIS_URL);
async function handleInbound(buf, meta) {
    // 1) fingerprint
    const fp = {
        contentHash: meta.contentHash,
        formatSig: meta.formatSig,
        timingSig: meta.timingSig,
        xformSig: meta.xformSig || 'nokpw',
        route: meta.route || 'unknown',
    };
    await store.put(fp);
    // 2) tariff + enforce
    const t = (0, tariff_js_1.applyTariffToRequest)({
        formatSig: fp.formatSig,
        timingSig: fp.timingSig,
        xformSig: fp.xformSig,
    });
    const tv = await t.enforce();
    // 3) policy (LAC/OPA) – call your existing gate here; include tv.minProofLevel
    return { tariff: tv, fingerprint: fp };
}
