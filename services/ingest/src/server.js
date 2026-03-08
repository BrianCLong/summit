"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const authz_1 = require("./lib/authz");
const app = (0, express_1.default)();
app.use((0, express_fileupload_1.default)());
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ingest" }));
app.post("/map/csv", async (req, res) => {
    if (!req.files)
        return res.status(400).json({ error: "file required" });
    const decision = await (0, authz_1.checkAuthz)({
        subject: {
            id: req.header("x-subject-id") || "anonymous",
            roles: (req.header("x-roles") || "").split(",").filter(Boolean),
            tenant: req.header("x-tenant") || "unknown",
            clearance: req.header("x-clearance") || "internal",
            mfa: req.header("x-mfa") || "unknown",
        },
        resource: {
            type: "ingest-job",
            id: "upload",
            tenant: req.header("x-tenant") || "unknown",
            classification: req.header("x-resource-classification") || "internal",
        },
        action: "ingest:write",
        context: {
            env: req.header("x-env") || "dev",
            request_ip: req.ip,
            time: new Date().toISOString(),
            risk: req.header("x-risk") || "elevated",
            reason: req.header("x-reason") || "csv import",
            warrant_id: req.header("x-warrant-id") || undefined,
        },
    });
    if (!decision.allow) {
        return res.status(403).json({ error: "forbidden", reasons: decision.deny });
    }
    return res.json({ entities: ["Person", "Org"], fieldsMapped: 5, lineageId: "lin_" + Date.now() });
});
app.listen(process.env.PORT || 8080);
