"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosureExportGuard = disclosureExportGuard;
const disclosure_repo_1 = require("./disclosure-repo");
const opa_disclosure_1 = require("../authz/opa-disclosure");
const events_1 = require("../telemetry/events");
async function disclosureExportGuard(req, res, next) {
    if (!req.subject) {
        return res.status(401).json({ error: "unauthenticated" });
    }
    const { id } = req.params;
    const pack = await (0, disclosure_repo_1.getDisclosurePackById)(id, req.subject.tenant_id);
    if (!pack) {
        return res.status(404).json({ error: "not_found" });
    }
    const resource = {
        type: "disclosure_pack",
        id: pack.id,
        tenant_id: pack.tenant_id,
        residency_region: pack.residency_region ?? "us"
    };
    const input = {
        subject: req.subject,
        resource,
        action: "disclosure:export"
    };
    try {
        const decision = await (0, opa_disclosure_1.evaluateDisclosureExport)(input);
        (0, events_1.trackEvent)(req, "disclosure_pack_export_attempt", {
            pack_id: pack.id,
            residency_region: resource.residency_region,
            decision: decision.allow,
            reason: decision.reason
        });
        if (!decision.allow) {
            return res.status(403).json({
                error: "forbidden",
                reason: decision.reason ?? "policy_denied"
            });
        }
        req.disclosurePack = pack;
        return next();
    }
    catch (err) {
        req.log?.error?.({ err }, "authz_disclosure_export_error");
        return res.status(503).json({ error: "authorization_unavailable" });
    }
}
