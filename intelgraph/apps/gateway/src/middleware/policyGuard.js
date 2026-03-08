"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyGuard = policyGuard;
const flags_1 = require("../flags");
const axios_1 = __importDefault(require("axios"));
async function policyGuard(req, res, next) {
    if (!flags_1.Flags.LAC_ENFORCE || req.method !== "POST" || req.path !== "/graphql")
        return next();
    try {
        const decision = await axios_1.default.post(process.env.POLICY_COMPILER_URL + "/decide", {
            query: req.body?.query, variables: req.body?.variables, caller: req.user ?? {}
        }, { timeout: 1000 });
        if (decision.data?.allow)
            return next();
        return res.status(403).json({ error: "Denied by policy", reason: decision.data?.reason });
    }
    catch (e) {
        // Fail closed
        return res.status(503).json({ error: "Policy service unavailable" });
    }
}
