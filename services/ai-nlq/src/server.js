"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const authz_1 = require("../../lib/authz");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ai-nlq" }));
app.post("/generate", (req, res) => {
    const { natural } = req.body || {};
    if (!natural)
        return res.status(400).json({ error: "missing natural" });
    (0, authz_1.checkAuthz)({
        subject: {
            id: req.header("x-subject-id") || "anonymous",
            roles: (req.header("x-roles") || "").split(",").filter(Boolean),
            tenant: req.header("x-tenant") || "unknown",
            clearance: req.header("x-clearance") || "internal",
            mfa: req.header("x-mfa") || "unknown",
        },
        resource: {
            type: "nlq-query",
            id: "preview",
            tenant: req.header("x-tenant") || "unknown",
            classification: req.header("x-resource-classification") || "internal",
        },
        action: "graph:query",
        context: {
            env: req.header("x-env") || "dev",
            request_ip: req.ip,
            time: new Date().toISOString(),
            risk: req.header("x-risk") || "low",
            reason: req.header("x-reason") || "nlq",
            warrant_id: req.header("x-warrant-id") || undefined,
        },
    })
        .then((decision) => {
        if (!decision.allow) {
            return res.status(403).json({ error: "forbidden", reasons: decision.deny });
        }
        const cypher = "MATCH (n) RETURN n LIMIT 10"; // placeholder
        return res.json({ cypher, reasoning: "fallback template", cost_est: { nodes: 10, hops: 1 }, preview_sample: [{ id: "n1" }] });
    })
        .catch((error) => res.status(503).json({ error: error.message }));
});
app.listen(process.env.PORT || 8080);
