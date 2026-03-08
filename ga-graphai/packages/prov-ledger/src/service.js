"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = exports.PostgresManifestStore = exports.InMemoryManifestStore = exports.InMemoryClaimTopic = void 0;
exports.buildLedgerRouter = buildLedgerRouter;
const node_events_1 = require("node:events");
const node_crypto_1 = require("node:crypto");
const express_1 = __importStar(require("express"));
const express_graphql_1 = require("express-graphql");
const graphql_1 = require("graphql");
const manifest_js_1 = require("./manifest.js");
const quantum_safe_ledger_js_1 = require("./quantum-safe-ledger.js");
class InMemoryClaimTopic extends node_events_1.EventEmitter {
    emitClaim(message) {
        this.emit('message', message);
    }
    subscribe(handler) {
        this.on('message', handler);
    }
}
exports.InMemoryClaimTopic = InMemoryClaimTopic;
class InMemoryManifestStore {
    manifests = new Map();
    async save(manifest) {
        this.manifests.set(manifest.caseId, manifest);
    }
    async latest(caseId) {
        return this.manifests.get(caseId) ?? null;
    }
}
exports.InMemoryManifestStore = InMemoryManifestStore;
class PostgresManifestStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async save(record) {
        await this.pool.query(`CREATE TABLE IF NOT EXISTS prov_manifests (
        case_id TEXT PRIMARY KEY,
        manifest JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`);
        await this.pool.query(`INSERT INTO prov_manifests(case_id, manifest, created_at)
       VALUES($1, $2, $3)
       ON CONFLICT (case_id) DO UPDATE SET manifest = excluded.manifest, created_at = excluded.created_at`, [record.caseId, record.manifest, record.createdAt]);
    }
    async latest(caseId) {
        await this.pool.query(`CREATE TABLE IF NOT EXISTS prov_manifests (
        case_id TEXT PRIMARY KEY,
        manifest JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`);
        const result = await this.pool.query('SELECT case_id, manifest, created_at FROM prov_manifests WHERE case_id = $1 LIMIT 1', [caseId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return { caseId: row.case_id, manifest: row.manifest, createdAt: row.created_at };
    }
}
exports.PostgresManifestStore = PostgresManifestStore;
class LedgerService {
    ledgers = new Map();
    manifestStore;
    topic;
    tokenService;
    now;
    identityPublicKey;
    manifestSigner;
    transparencyLog;
    constructor(options = {}) {
        this.manifestStore = options.manifestStore ?? new InMemoryManifestStore();
        this.topic = options.claimTopic ?? new InMemoryClaimTopic();
        this.now = options.now ?? (() => new Date());
        this.tokenService = new quantum_safe_ledger_js_1.AccessTokenService(options.tokenSecret ?? 'prov-ledger-secret', {
            ttlMs: 5 * 60 * 1000,
            now: this.now,
        });
        this.identityPublicKey = options.identityPublicKey;
        const keyPair = (0, node_crypto_1.generateKeyPairSync)('rsa', { modulusLength: 2048 });
        const defaultPrivateKey = keyPair.privateKey
            .export({ format: 'pem', type: 'pkcs1' })
            .toString();
        const defaultPublicKey = keyPair.publicKey
            .export({ format: 'pem', type: 'pkcs1' })
            .toString();
        this.manifestSigner = {
            issuer: options.issuer ?? 'prov-ledger',
            keyId: options.issuerKeyId ?? 'issuer-key',
            privateKey: options.issuerPrivateKey ?? defaultPrivateKey,
            publicKey: options.issuerPublicKey ?? defaultPublicKey,
        };
        this.transparencyLog = options.transparencyLog ?? new manifest_js_1.TransparencyLog(this.now);
    }
    issueAccess(actor, scope) {
        return this.tokenService.issue(actor, scope).token;
    }
    ledger(caseId) {
        const existing = this.ledgers.get(caseId);
        if (existing)
            return existing;
        const ledger = new quantum_safe_ledger_js_1.QuantumSafeLedger(this.tokenService, {
            now: this.now,
            identityPublicKey: this.identityPublicKey,
        });
        this.ledgers.set(caseId, ledger);
        return ledger;
    }
    appendClaim(caseId, fact, signature, accessToken, zkProof) {
        const ledger = this.ledger(caseId);
        const entry = ledger.append(fact, signature, accessToken, zkProof);
        this.topic.emitClaim({ caseId, fact });
        return entry;
    }
    registerEvidence(caseId, evidence) {
        const hash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(evidence)).digest('hex');
        const stamped = { ...evidence, headHash: evidence.headHash ?? hash };
        return stamped;
    }
    exportManifest(caseId) {
        const ledger = this.ledger(caseId);
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId,
            ledger: ledger.list(500),
            issuer: this.manifestSigner.issuer,
            keyId: this.manifestSigner.keyId,
            privateKey: this.manifestSigner.privateKey,
            publicKey: this.manifestSigner.publicKey,
            transparencyLog: this.transparencyLog,
            now: this.now,
        });
        const record = {
            caseId,
            manifest,
            createdAt: this.now().toISOString(),
        };
        void this.manifestStore.save(record);
        return record;
    }
    async latestManifest(caseId) {
        return this.manifestStore.latest(caseId);
    }
    listEntries(caseId, limit = 200) {
        const ledger = this.ledger(caseId);
        return ledger.list(limit);
    }
}
exports.LedgerService = LedgerService;
function buildLedgerRouter(service) {
    const router = (0, express_1.Router)();
    const jsonHandler = express_1.default.json();
    router.use(jsonHandler);
    router.post('/ledger/claim', ((req, res) => {
        const { caseId, fact, signature, accessToken, zkProof } = req.body ?? {};
        if (!caseId || !fact || !signature || !accessToken) {
            return res.status(400).json({ error: 'caseId, fact, signature, and accessToken are required' });
        }
        try {
            const entry = service.appendClaim(caseId, fact, signature, accessToken, zkProof);
            return res.status(201).json({ entry });
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }));
    router.post('/ledger/evidence', ((req, res) => {
        const { caseId, evidence } = req.body ?? {};
        if (!caseId || !evidence) {
            return res.status(400).json({ error: 'caseId and evidence are required' });
        }
        const bundle = service.registerEvidence(caseId, evidence);
        return res.status(201).json({ bundle });
    }));
    router.get('/ledger/export/:caseId', ((req, res) => {
        const caseId = req.params.caseId;
        const record = service.exportManifest(caseId);
        return res.json(record);
    }));
    const schema = (0, graphql_1.buildSchema)(`
    type ProvEntry {
      id: String!
      category: String!
      actor: String!
      action: String!
      resource: String!
      payload: String!
      timestamp: String!
      previousHash: String
      hash: String!
    }

    type ProvManifest {
      caseId: String!
      generatedAt: String!
      version: String!
      ledgerHead: String!
      merkleRoot: String!
      transforms: [ProvTransform!]!
    }

    type ProvTransform {
      id: String!
      category: String!
      actor: String!
      action: String!
      resource: String!
      payloadHash: String!
      timestamp: String!
      previousHash: String
    }

    type Query {
      prov_entries(caseId: String!, limit: Int): [ProvEntry!]!
      prov_manifest(caseId: String!): ProvManifest
    }
  `);
    const root = {
        prov_entries: ({ caseId, limit }) => {
            const entries = service.listEntries(caseId, limit ?? 200);
            return entries.map((entry) => ({
                ...entry,
                payload: JSON.stringify(entry.payload),
            }));
        },
        prov_manifest: async ({ caseId }) => {
            const latest = await service.latestManifest(caseId);
            if (latest)
                return latest.manifest;
            const record = service.exportManifest(caseId);
            return record.manifest;
        },
    };
    router.use('/graphql', (0, express_graphql_1.graphqlHTTP)({
        schema,
        rootValue: root,
        graphiql: false,
        customFormatErrorFn: (err) => new graphql_1.GraphQLError(err.message),
    }));
    return router;
}
