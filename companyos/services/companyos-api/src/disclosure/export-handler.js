"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDisclosurePackHandler = exportDisclosurePackHandler;
const events_1 = require("../telemetry/events");
function exportDisclosurePackHandler(req, res) {
    const pack = req.disclosurePack?.raw_json;
    if (!pack) {
        return res.status(500).json({ error: "export_state_missing" });
    }
    (0, events_1.trackEvent)(req, "disclosure_pack_exported", {
        pack_id: pack.id,
        environment: pack.environment,
        residency_region: pack.residency_region ?? "us"
    });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="disclosure-${pack.id}.json"`);
    return res.status(200).send(pack);
}
