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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuditBundle = buildAuditBundle;
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const postgres_js_1 = require("../db/postgres.js");
const redact_js_1 = require("../redaction/redact.js");
const bundle_js_1 = require("./bundle.js");
const DEFAULT_LIMIT = 5000;
async function hashFile(filePath) {
    const hash = (0, crypto_1.createHash)('sha256');
    const { createReadStream } = await Promise.resolve().then(() => __importStar(require('fs')));
    return new Promise((resolve, reject) => {
        const stream = createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
function merkleFromHashes(hashes) {
    if (hashes.length === 0)
        return '';
    let layer = hashes.slice().sort();
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? layer[i];
            const digest = (0, crypto_1.createHash)('sha256')
                .update(left + right)
                .digest('hex');
            next.push(digest);
        }
        layer = next;
    }
    return layer[0];
}
async function writeJson(filePath, payload) {
    await (0, promises_1.writeFile)(filePath, JSON.stringify(payload, null, 2), 'utf8');
}
async function buildAuditBundle({ tenantId, startTime, endTime, format = 'tar', outputPath, limit = DEFAULT_LIMIT, }) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const redaction = new redact_js_1.RedactionService();
    const workdir = await (0, promises_1.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'audit-bundle-'));
    const artifacts = [];
    const checksums = {};
    await (0, promises_1.mkdir)(workdir, { recursive: true });
    const window = {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
    };
    const auditQuery = await pool.query(`SELECT * FROM audit_events
     WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC
     LIMIT $4`, [tenantId, window.start, window.end, limit]);
    const policyQuery = await pool.query(`SELECT * FROM policy_audit
     WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC
     LIMIT $4`, [tenantId, window.start, window.end, limit]);
    const sbomQuery = await pool.query(`SELECT sr.run_id, sr.sbom, sr.created_at
       FROM sbom_reports sr
       JOIN run r ON r.id = sr.run_id
      WHERE r.tenant_id = $1
        AND sr.created_at BETWEEN $2 AND $3
      ORDER BY sr.created_at ASC
      LIMIT $4`, [tenantId, window.start, window.end, limit]);
    const provenanceQuery = await pool.query(`SELECT id, source_type, source_id, user_id, entity_count, relationship_count, hash_manifest, transform_chain, metadata, created_at
       FROM provenance_records
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at ASC
      LIMIT $4`, [tenantId, window.start, window.end, limit]);
    const policy = { rules: ['pii', 'sensitive', 'financial'] };
    const auditEvents = await Promise.all(auditQuery.rows.map((row) => redaction.redactObject(row, policy, tenantId, {
        purpose: 'audit_bundle',
    })));
    const policyDecisions = await Promise.all(policyQuery.rows.map((row) => redaction.redactObject(row, policy, tenantId, {
        purpose: 'audit_bundle',
    })));
    const auditPath = path_1.default.join(workdir, 'audit-events.json');
    await writeJson(auditPath, {
        tenantId,
        window,
        count: auditEvents.length,
        events: auditEvents,
    });
    checksums['audit-events.json'] = await hashFile(auditPath);
    artifacts.push({ name: 'audit-events.json', path: auditPath });
    const policyPath = path_1.default.join(workdir, 'policy-decisions.json');
    await writeJson(policyPath, {
        tenantId,
        window,
        count: policyDecisions.length,
        decisions: policyDecisions,
    });
    checksums['policy-decisions.json'] = await hashFile(policyPath);
    artifacts.push({ name: 'policy-decisions.json', path: policyPath });
    const sbomPath = path_1.default.join(workdir, 'sbom-reports.json');
    const sbomReports = sbomQuery.rows.map((row) => ({
        runId: row.run_id,
        createdAt: row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at,
        sbom: row.sbom,
    }));
    await writeJson(sbomPath, {
        tenantId,
        window,
        count: sbomReports.length,
        reports: sbomReports,
    });
    checksums['sbom-reports.json'] = await hashFile(sbomPath);
    artifacts.push({ name: 'sbom-reports.json', path: sbomPath });
    const provenancePath = path_1.default.join(workdir, 'provenance-records.json');
    await writeJson(provenancePath, {
        tenantId,
        window,
        count: provenanceQuery.rows.length,
        records: provenanceQuery.rows,
    });
    checksums['provenance-records.json'] = await hashFile(provenancePath);
    artifacts.push({ name: 'provenance-records.json', path: provenancePath });
    const merkleRoot = merkleFromHashes(Object.values(checksums));
    const claimSet = {
        id: `audit-bundle-${tenantId}-${Date.now()}`,
        tenantId,
        window,
        counts: {
            auditEvents: auditEvents.length,
            policyDecisions: policyDecisions.length,
            sbomReports: sbomReports.length,
            provenanceRecords: provenanceQuery.rows.length,
        },
        createdAt: new Date().toISOString(),
    };
    const { path: bundlePath, sha256 } = await (0, bundle_js_1.makeBundle)({
        artifacts,
        claimSet,
        merkleRoot,
        attestations: [],
        format,
        checksums,
    });
    const finalPath = outputPath && outputPath !== bundlePath
        ? path_1.default.resolve(outputPath)
        : bundlePath;
    if (finalPath !== bundlePath) {
        await (0, promises_1.copyFile)(bundlePath, finalPath);
    }
    return {
        bundlePath: finalPath,
        sha256,
        checksums,
        claimSet,
        merkleRoot,
        format,
    };
}
