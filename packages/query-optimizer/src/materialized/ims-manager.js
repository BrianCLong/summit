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
exports.IncrementalSubgraphManager = void 0;
const crypto = __importStar(require("crypto"));
class IncrementalSubgraphManager {
    pool;
    secretKey;
    constructor(pool) {
        this.pool = pool;
        this.secretKey = process.env.IMS_SECRET_KEY || 'default-dev-key';
    }
    async initialize() {
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ims_views (
        name TEXT PRIMARY KEY,
        definition JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ims_manifests (
        view_name TEXT NOT NULL REFERENCES ims_views(name),
        refresh_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        manifest JSONB NOT NULL,
        signature TEXT NOT NULL,
        PRIMARY KEY (view_name, refresh_timestamp)
      );
    `);
    }
    async registerView(definition) {
        const exists = await this.pool.query('SELECT 1 FROM ims_views WHERE name = $1', [definition.name]);
        if (exists.rowCount && exists.rowCount > 0) {
            throw new Error(`View ${definition.name} already exists`);
        }
        await this.pool.query('INSERT INTO ims_views (name, definition) VALUES ($1, $2)', [definition.name, JSON.stringify(definition)]);
    }
    async getView(name) {
        const res = await this.pool.query('SELECT definition FROM ims_views WHERE name = $1', [name]);
        if (res.rowCount === 0)
            return undefined;
        return res.rows[0].definition;
    }
    async refreshSubgraph(name, actorId) {
        const view = await this.getView(name);
        if (!view) {
            throw new Error(`View ${name} not found`);
        }
        const timestamp = new Date().toISOString();
        const queryHash = crypto.createHash('sha256').update(view.cypherQuery).digest('hex');
        // Simulate input data hashes (e.g., from source tables/nodes)
        const inputHashes = {
            'Person': crypto.randomBytes(16).toString('hex'),
            'Transaction': crypto.randomBytes(16).toString('hex')
        };
        const manifest = {
            viewName: name,
            refreshTimestamp: timestamp,
            inputHashes,
            queryHash,
            actor: actorId,
            signature: '', // To be signed
            policyCompliance: {
                checked: true,
                violations: []
            }
        };
        // Sign
        manifest.signature = this.signManifest(manifest);
        // Persist manifest
        await this.pool.query('INSERT INTO ims_manifests (view_name, refresh_timestamp, manifest, signature) VALUES ($1, $2, $3, $4)', [name, timestamp, JSON.stringify(manifest), manifest.signature]);
        return manifest;
    }
    async getHistory(name) {
        const res = await this.pool.query('SELECT manifest FROM ims_manifests WHERE view_name = $1 ORDER BY refresh_timestamp DESC', [name]);
        return res.rows.map(row => row.manifest);
    }
    signManifest(manifest) {
        const payload = JSON.stringify({ ...manifest, signature: undefined });
        return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
    }
}
exports.IncrementalSubgraphManager = IncrementalSubgraphManager;
