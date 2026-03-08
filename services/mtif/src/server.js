"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const config_js_1 = require("./config.js");
const FeedRepository_js_1 = require("./services/FeedRepository.js");
const TaxiiService_js_1 = require("./services/TaxiiService.js");
const lrt_js_1 = require("./adapters/lrt.js");
const BundleFactory_js_1 = require("./services/BundleFactory.js");
const signing_js_1 = require("./utils/signing.js");
const ppc_js_1 = require("./adapters/ppc.js");
const rsr_js_1 = require("./adapters/rsr.js");
const parseMatchFilters = (query) => {
    const match = {};
    for (const [key, value] of Object.entries(query)) {
        const matchExpr = key.match(/^match\[(.+)]$/);
        if (matchExpr && typeof value === 'string') {
            match[matchExpr[1]] = value;
        }
    }
    return Object.keys(match).length > 0 ? match : undefined;
};
const toQueryOptions = (req) => {
    const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : undefined;
    const next = req.query.next ? String(req.query.next) : undefined;
    const added_after = req.query.added_after ? String(req.query.added_after) : undefined;
    const match = parseMatchFilters(req.query);
    return { limit, next, added_after, match };
};
const bootstrapRepository = () => new FeedRepository_js_1.FeedRepository([
    {
        id: FeedRepository_js_1.COLLECTION_DEFAULT_ID,
        alias: 'mtif-llm-threats',
        title: 'Model Threat Intelligence Feed',
        description: 'Canonical repository of LLM attack prompts, jailbreaks, and tool abuse signatures.',
        can_read: true,
        can_write: true
    }
]);
const createApp = (configOverride) => {
    const config = { ...(0, config_js_1.loadConfig)(), ...configOverride };
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '2mb' }));
    const repository = bootstrapRepository();
    const taxiiService = new TaxiiService_js_1.TaxiiService(repository, { apiRoot: config.apiRoot });
    const signing = new signing_js_1.SigningService(config.signingSecret);
    app.get('/healthz', (_req, res) => {
        res.json({ status: 'ok' });
    });
    app.get('/taxii2/', (_req, res) => {
        res.json(taxiiService.discoveryDocument());
    });
    app.get('/taxii2/api-root/', (_req, res) => {
        res.json(taxiiService.apiRootInformation());
    });
    app.get('/taxii2/api-root/collections', (_req, res) => {
        res.json({ collections: taxiiService.listCollections() });
    });
    app.get('/taxii2/api-root/collections/:id/objects', (req, res) => {
        try {
            const result = taxiiService.queryObjects(req.params.id, toQueryOptions(req));
            res.json({ ...result });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.post('/taxii2/api-root/collections/:id/objects', (req, res) => {
        try {
            const bundle = req.body;
            repository.ingestBundle(req.params.id, bundle);
            res.status(202).json({ status: 'accepted' });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.post('/feeds/lrt', (req, res) => {
        try {
            const threats = (0, lrt_js_1.ingestLrtRun)(req.body);
            const bundle = (0, BundleFactory_js_1.buildBundle)(threats, { producerName: 'LLM Red Team Telemetry' });
            repository.ingestBundle(FeedRepository_js_1.COLLECTION_DEFAULT_ID, bundle);
            res.status(201).json({ bundle_id: bundle.id, object_count: bundle.objects.length });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    const collectAllObjects = () => {
        const aggregated = [];
        let next;
        do {
            const page = repository.getObjects(FeedRepository_js_1.COLLECTION_DEFAULT_ID, { limit: 200, next });
            aggregated.push(...page.objects);
            next = page.next;
            if (!page.more) {
                break;
            }
        } while (next);
        return aggregated;
    };
    app.get('/guards/ppc', (_req, res) => {
        const objects = collectAllObjects();
        const update = (0, ppc_js_1.exportToPpc)(objects, signing);
        res.json(update);
    });
    app.get('/guards/rsr', (_req, res) => {
        const objects = collectAllObjects();
        const update = (0, rsr_js_1.exportToRsr)(objects, signing);
        res.json(update);
    });
    return { app, repository, signing, taxiiService };
};
exports.createApp = createApp;
if (process.env.NODE_ENV !== 'test') {
    const config = (0, config_js_1.loadConfig)();
    const { app } = (0, exports.createApp)(config);
    app.listen(config.port, () => {
        // eslint-disable-next-line no-console
        console.log(`MTIF service listening on port ${config.port}`);
    });
}
