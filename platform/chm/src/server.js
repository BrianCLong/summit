"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const uuid_1 = require("uuid");
const rules_js_1 = require("./rules.js");
const workflows_js_1 = require("./workflows.js");
const taxonomy_js_1 = require("./taxonomy.js");
const createApp = ({ pool, config }) => {
    const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use(body_parser_1.default.json());
    app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
    app.post('/taxonomy/seed', async (_req, res) => {
        await Promise.all(taxonomy_js_1.defaultTaxonomy.map((level) => pool.query(`INSERT INTO taxonomy_levels (code, name, max_duration_days)
           VALUES ($1, $2, $3)
           ON CONFLICT (code) DO UPDATE SET name = excluded.name, max_duration_days = excluded.max_duration_days`, [level.code, level.name, level.maxDurationDays])));
        res.json({ status: 'ok', count: taxonomy_js_1.defaultTaxonomy.length });
    });
    app.post('/documents', async (req, res) => {
        const { id, title, classificationCode, residency, license, derivedFrom, actor } = req.body;
        try {
            const documentId = id || (0, uuid_1.v4)();
            await (0, rules_js_1.createDocument)(pool, {
                id: documentId,
                title,
                classificationCode: (0, taxonomy_js_1.normalizeCode)(classificationCode),
                residency,
                license,
                derivedFrom: Boolean(derivedFrom)
            }, actor || 'system');
            res.status(201).json({ status: 'created', id: documentId });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    });
    app.post('/export/:id', async (req, res) => {
        const decision = await (0, rules_js_1.evaluateExport)(pool, req.params.id, config);
        res.json(decision);
    });
    app.get('/rules/:id', async (req, res) => {
        const doc = await (0, rules_js_1.getDocument)(pool, req.params.id);
        if (!doc) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.json({
            view: (0, rules_js_1.evaluateView)(doc),
            handle: (0, rules_js_1.evaluateHandle)(doc),
            export: await (0, rules_js_1.evaluateExport)(pool, req.params.id, config)
        });
    });
    app.post('/downgrade/requests', async (req, res) => {
        const { documentId, requestedCode, justification, actor } = req.body;
        try {
            const id = await (0, workflows_js_1.createDowngradeRequest)(pool, {
                documentId,
                requestedCode,
                justification,
                actor: actor || 'system'
            });
            res.status(201).json({ id, status: 'pending' });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    });
    app.post('/downgrade/approve', async (req, res) => {
        const { requestId, approver } = req.body;
        try {
            const status = await (0, workflows_js_1.approveDowngrade)(pool, { requestId, approver });
            res.json({ status });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    });
    app.get('/audit/:documentId', async (req, res) => {
        const rows = await pool.query(`SELECT id, action, actor, details, created_at FROM audit_receipts WHERE document_id = $1 ORDER BY created_at DESC`, [req.params.documentId]);
        res.json(rows.rows);
    });
    return app;
};
exports.createApp = createApp;
