"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDisclosureRoutes = createDisclosureRoutes;
exports.createDisclosureIngestHandler = createDisclosureIngestHandler;
const express_1 = require("express");
const disclosureRepo_js_1 = require("./disclosureRepo.js");
const events_js_1 = require("../telemetry/events.js");
function getTenantId(req) {
    return req.subject?.tenant_id ?? null;
}
function createDisclosureRoutes(db) {
    const router = (0, express_1.Router)();
    const repo = new disclosureRepo_js_1.DisclosureRepository(db);
    router.get('/', async (req, res) => {
        const tenantId = getTenantId(req);
        if (!tenantId) {
            return res.status(401).json({ error: 'unauthenticated' });
        }
        const environment = req.query.environment;
        try {
            const packs = await repo.listDisclosurePacksForTenant(tenantId, environment);
            (0, events_js_1.trackEvent)(req, 'disclosure_pack_list_viewed', {
                count: packs.length,
                environment: environment ?? 'any',
            });
            return res.json({
                items: packs.map((pack) => ({
                    id: pack.id,
                    tenant_id: pack.tenant_id,
                    product: pack.product,
                    environment: pack.environment,
                    build_id: pack.build_id,
                    generated_at: pack.generated_at,
                    vuln_summary: {
                        critical: pack.vuln_critical,
                        high: pack.vuln_high,
                        medium: pack.vuln_medium,
                        low: pack.vuln_low,
                    },
                })),
            });
        }
        catch (error) {
            req.log?.error?.({ error: error.message }, 'failed_to_list_disclosure_packs');
            return res.status(500).json({ error: 'failed_to_list_disclosure_packs' });
        }
    });
    router.get('/:id', async (req, res) => {
        const tenantId = getTenantId(req);
        if (!tenantId) {
            return res.status(401).json({ error: 'unauthenticated' });
        }
        const { id } = req.params;
        try {
            const pack = await repo.getDisclosurePackById(id, tenantId);
            if (!pack) {
                return res.status(404).json({ error: 'not_found' });
            }
            (0, events_js_1.trackEvent)(req, 'disclosure_pack_viewed', {
                id,
                environment: pack.environment,
            });
            return res.json(pack.raw_json);
        }
        catch (error) {
            req.log?.error?.({
                error: error.message,
                id,
            });
            return res.status(500).json({ error: 'failed_to_fetch_disclosure_pack' });
        }
    });
    router.get('/:id/export', async (req, res) => {
        const tenantId = getTenantId(req);
        if (!tenantId) {
            return res.status(401).json({ error: 'unauthenticated' });
        }
        const { id } = req.params;
        try {
            const pack = await repo.getDisclosurePackById(id, tenantId);
            if (!pack) {
                return res.status(404).json({ error: 'not_found' });
            }
            (0, events_js_1.trackEvent)(req, 'disclosure_pack_exported', {
                id,
                environment: pack.environment,
                format: 'json',
            });
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="disclosure-${id}.json"`);
            return res.send(JSON.stringify(pack.raw_json, null, 2));
        }
        catch (error) {
            req.log?.error?.({
                error: error.message,
                id,
            });
            return res.status(500).json({ error: 'failed_to_export_disclosure_pack' });
        }
    });
    return router;
}
function createDisclosureIngestHandler(db) {
    const repo = new disclosureRepo_js_1.DisclosureRepository(db);
    return async (req, res) => {
        const pack = req.body;
        if (!pack || typeof pack !== 'object') {
            return res.status(400).json({ error: 'invalid_payload' });
        }
        try {
            await repo.upsertDisclosurePackFromJson(pack);
            req.log?.info?.({ id: pack.id, tenant_id: pack.tenant_id }, 'disclosure_pack_ingested');
            return res.status(202).json({ status: 'accepted' });
        }
        catch (error) {
            req.log?.error?.({ error: error.message }, 'disclosure_pack_ingest_failed');
            return res.status(500).json({ error: 'failed_to_ingest_disclosure_pack' });
        }
    };
}
