"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachFlagContext = attachFlagContext;
exports.attachFlagHeaders = attachFlagHeaders;
const index_1 = require("@intelgraph/flags/index");
const client = new index_1.FlagClient({ env: process.env.NODE_ENV ?? "dev" });
const policyFlag = client.catalogKey("feature.policy-guard");
function attachFlagContext(req, _res, next) {
    req.flagContext = {
        env: process.env.NODE_ENV ?? "dev",
        tenant: req.header("x-tenant-id") ?? req.query.tenant?.toString(),
        userId: req.user?.id,
        userRole: req.user?.roles?.[0],
        region: req.header("x-region"),
        canaryWeight: Number(req.header("x-canary-weight") ?? 0),
    };
    next();
}
async function attachFlagHeaders(req, res, next) {
    const ctx = req.flagContext ?? { env: process.env.NODE_ENV ?? "dev" };
    const enabled = await client.get(policyFlag, false, ctx);
    req.flags = { [policyFlag]: enabled };
    res.setHeader("x-feature-flags", JSON.stringify(req.flags));
    next();
}
