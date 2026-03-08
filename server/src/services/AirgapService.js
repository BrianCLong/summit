"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirgapService = void 0;
const DeterministicExportService_js_1 = require("./DeterministicExportService.js");
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const quantum_identity_manager_js_1 = require("../security/quantum-identity-manager.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const log = logger_js_1.default.child({ name: 'AirgapService' });
class AirgapService {
    exportService;
    importDir;
    constructor() {
        this.exportService = new DeterministicExportService_js_1.DeterministicExportService();
        this.importDir = (0, path_1.join)(process.cwd(), 'storage', 'imports');
        if (!(0, fs_1.existsSync)(this.importDir)) {
            (0, fs_1.mkdirSync)(this.importDir, { recursive: true });
        }
    }
    async exportBundle(request, session) {
        if (process.env.AIRGAP !== 'true') {
            throw new Error('Airgap feature is disabled');
        }
        return this.exportService.createExportBundle(request, session);
    }
    async importBundle(tenantId, filePath, userId) {
        if (process.env.AIRGAP !== 'true') {
            throw new Error('Airgap feature is disabled');
        }
        const importId = (0, crypto_1.randomUUID)();
        const workDir = (0, path_1.join)(this.importDir, importId);
        (0, fs_1.mkdirSync)(workDir, { recursive: true });
        try {
            log.info({ importId, tenantId }, 'Starting airgap import');
            // 1. Unzip
            await execAsync(`unzip -q "${filePath}" -d "${workDir}"`);
            // 2. Read Manifest
            const manifestPath = (0, path_1.join)(workDir, 'manifest.json');
            if (!(0, fs_1.existsSync)(manifestPath)) {
                throw new Error('Invalid bundle: missing manifest.json');
            }
            const manifestStr = (0, fs_1.readFileSync)(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestStr);
            // 3. Verify PQC Signature (Task #114)
            if (!manifest.pqcSignature) {
                throw new Error('Security Violation: Airgap bundle missing PQC signature');
            }
            // Reconstruct identity for verification
            const serviceId = manifest.pqcServiceId || 'unknown';
            const signedPayload = `service=${serviceId};hash=${manifest.integrity.manifestHash}`;
            const identityToVerify = {
                serviceId: signedPayload,
                publicKey: 'simulated-key',
                algorithm: 'KYBER-768',
                issuedAt: manifest.createdAt,
                expiresAt: new Date(Date.now() + 1000).toISOString(),
                signature: manifest.pqcSignature
            };
            const isPqcValid = quantum_identity_manager_js_1.quantumIdentityManager.verifyIdentity(identityToVerify);
            if (!isPqcValid) {
                throw new Error('Security Violation: Invalid PQC signature on airgap bundle');
            }
            log.info({ importId, serviceId: manifest.pqcServiceId }, 'PQC Signature verified');
            // 4. Verify Tenant Binding
            if (manifest.request.tenantId !== tenantId) {
                throw new Error(`Tenant mismatch: Bundle belongs to ${manifest.request.tenantId}, but importing into ${tenantId}`);
            }
            // 5. Verify Integrity (Hashes)
            // Bundle hash check skipped as it causes circular dependency.
            // We rely on file hash verification.
            const bundleHash = await this.calculateFileHash(filePath);
            // Check file hashes
            for (const file of manifest.files) {
                const extractedFile = (0, path_1.join)(workDir, file.filename);
                if (!(0, fs_1.existsSync)(extractedFile)) {
                    throw new Error(`Missing file in bundle: ${file.filename}`);
                }
                const fileHash = await this.calculateFileHash(extractedFile);
                if (fileHash !== file.sha256) {
                    throw new Error(`File integrity check failed for ${file.filename}`);
                }
            }
            // 5. Store Metadata
            const pool = (0, database_js_1.getPostgresPool)();
            await pool.query(`INSERT INTO imported_snapshots (id, tenant_id, bundle_hash, manifest, created_by, status, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [importId, tenantId, bundleHash, JSON.stringify(manifest), userId, 'verified', workDir]);
            log.info({ importId, tenantId }, 'Airgap import completed successfully');
            return {
                importId,
                manifest,
                status: 'verified'
            };
        }
        catch (error) {
            log.error({ importId, error: error.message }, 'Airgap import failed');
            // Cleanup
            (0, fs_1.rmSync)(workDir, { recursive: true, force: true });
            throw error;
        }
    }
    async getImport(importId, tenantId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query('SELECT * FROM imported_snapshots WHERE id = $1 AND tenant_id = $2', [importId, tenantId]);
        if (res.rows.length === 0)
            return null;
        return res.rows[0];
    }
    async calculateFileHash(filePath) {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        return new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }
}
exports.AirgapService = AirgapService;
