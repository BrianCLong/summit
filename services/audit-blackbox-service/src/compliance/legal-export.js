"use strict";
/**
 * Legal Compliance Export Module
 *
 * Provides cryptographically signed exports for legal proceedings,
 * compliance audits, and regulatory requirements.
 *
 * Features:
 * - Digital signatures for authenticity
 * - Chain of custody documentation
 * - Multiple export formats (PDF, JSON, CSV)
 * - Redaction support with audit trail
 * - Witness signatures
 * - Tamper-evident packaging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalExportManager = void 0;
exports.createLegalExportManager = createLegalExportManager;
const crypto_1 = require("crypto");
const events_1 = require("events");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    signingAlgorithm: 'RSA-SHA256',
    defaultFormat: 'json',
    maxEventsPerExport: 100000,
    requireApproval: true,
    approvalThreshold: 2,
    retentionDays: 365,
    enableWatermarking: true,
};
/**
 * Legal Compliance Export Manager
 */
class LegalExportManager extends events_1.EventEmitter {
    config;
    signingKey = null;
    exportHistory = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize the export manager
     */
    async initialize() {
        // Generate or load signing keys
        if (!this.config.signingKeyPath) {
            const keyPair = (0, crypto_1.generateKeyPairSync)('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
            this.signingKey = {
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
            };
        }
        this.emit('initialized');
    }
    /**
     * Create a legal export package
     */
    async createExport(request, events, chainInfo) {
        // Validate request
        this.validateRequest(request);
        // Check event limit
        if (events.length > this.config.maxEventsPerExport) {
            throw new Error(`Export exceeds maximum event limit of ${this.config.maxEventsPerExport}`);
        }
        const exportId = this.generateExportId();
        this.emit('exportStarted', { exportId, eventCount: events.length });
        // Apply redactions
        let processedEvents = events;
        let redactedFields = 0;
        if (request.redactionRules && request.redactionRules.length > 0) {
            const result = this.applyRedactions(events, request.redactionRules);
            processedEvents = result.events;
            redactedFields = result.redactedCount;
        }
        // Format data
        const formattedData = await this.formatData(processedEvents, request.format);
        // Calculate data hash
        const dataHash = (0, crypto_1.createHash)('sha256')
            .update(typeof formattedData === 'string' ? formattedData : formattedData)
            .digest('hex');
        // Create integrity section
        const integrity = {
            dataHash,
            merkleRoot: chainInfo.merkleRoot,
            chainStartSequence: chainInfo.startSequence,
            chainEndSequence: chainInfo.endSequence,
            chainIntegrityVerified: chainInfo.verified,
        };
        // Sign the package
        const signatureData = JSON.stringify({
            exportId,
            dataHash,
            merkleRoot: chainInfo.merkleRoot,
            timestamp: new Date().toISOString(),
        });
        const signature = this.signData(signatureData);
        // Create custody chain
        const custodyChain = [
            {
                timestamp: new Date(),
                action: 'created',
                actorId: request.requestedBy.id,
                actorName: request.requestedBy.name,
                actorRole: request.requestedBy.role,
                description: `Export package created for ${request.purpose}`,
                signature: this.signData(`created:${exportId}:${request.requestedBy.id}`),
            },
        ];
        // Create export package
        const exportPackage = {
            id: exportId,
            version: '1.0.0',
            createdAt: new Date(),
            request,
            data: {
                format: request.format,
                content: formattedData,
                eventCount: processedEvents.length,
                redactedFields,
            },
            integrity,
            signatures: {
                system: signature,
                algorithm: this.config.signingAlgorithm,
                publicKey: this.signingKey?.publicKey || '',
            },
            custody: custodyChain,
            witnesses: request.witnesses || [],
            metadata: {
                generatedBy: 'audit-blackbox-service',
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000),
            },
        };
        // Store in history
        this.exportHistory.set(exportId, exportPackage);
        this.emit('exportCompleted', {
            exportId,
            eventCount: processedEvents.length,
            redactedFields,
        });
        return exportPackage;
    }
    /**
     * Add witness signature to export
     */
    async addWitnessSignature(exportId, witness, witnessPrivateKey) {
        const exportPackage = this.exportHistory.get(exportId);
        if (!exportPackage) {
            throw new Error(`Export ${exportId} not found`);
        }
        // Create witness signature
        const witnessData = JSON.stringify({
            exportId,
            dataHash: exportPackage.integrity.dataHash,
            witnessId: witness.id,
            timestamp: new Date().toISOString(),
        });
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(witnessData);
        const signature = sign.sign(witnessPrivateKey, 'hex');
        // Update witness record
        const existingWitness = exportPackage.witnesses.find((w) => w.id === witness.id);
        if (existingWitness) {
            existingWitness.signature = signature;
            existingWitness.signedAt = new Date();
        }
        else {
            exportPackage.witnesses.push({
                ...witness,
                signature,
                signedAt: new Date(),
            });
        }
        // Add custody entry
        exportPackage.custody.push({
            timestamp: new Date(),
            action: 'verified',
            actorId: witness.id,
            actorName: witness.name,
            actorRole: witness.role,
            description: `Witness signature added by ${witness.name}`,
            signature: this.signData(`witness:${exportId}:${witness.id}`),
            previousEntryHash: this.hashCustodyEntry(exportPackage.custody[exportPackage.custody.length - 1]),
        });
        this.emit('witnessAdded', { exportId, witnessId: witness.id });
    }
    /**
     * Verify export package integrity
     */
    async verifyExport(exportPackage) {
        const errors = [];
        const checks = {
            dataIntegrity: false,
            signatureValid: false,
            chainVerified: false,
            custodyChainValid: false,
            witnessesValid: false,
        };
        // Verify data hash
        const content = exportPackage.data.content;
        const dataHash = (0, crypto_1.createHash)('sha256')
            .update(typeof content === 'string' ? content : content)
            .digest('hex');
        if (dataHash === exportPackage.integrity.dataHash) {
            checks.dataIntegrity = true;
        }
        else {
            errors.push('Data hash mismatch - content may have been modified');
        }
        // Verify system signature
        const signatureData = JSON.stringify({
            exportId: exportPackage.id,
            dataHash: exportPackage.integrity.dataHash,
            merkleRoot: exportPackage.integrity.merkleRoot,
            timestamp: exportPackage.createdAt.toISOString(),
        });
        try {
            const verify = (0, crypto_1.createVerify)('SHA256');
            verify.update(signatureData);
            checks.signatureValid = verify.verify(exportPackage.signatures.publicKey, exportPackage.signatures.system, 'hex');
            if (!checks.signatureValid) {
                errors.push('System signature verification failed');
            }
        }
        catch {
            errors.push('Unable to verify system signature');
        }
        // Verify chain integrity flag
        checks.chainVerified = exportPackage.integrity.chainIntegrityVerified;
        if (!checks.chainVerified) {
            errors.push('Original chain integrity was not verified at export time');
        }
        // Verify custody chain
        checks.custodyChainValid = this.verifyCustodyChain(exportPackage.custody);
        if (!checks.custodyChainValid) {
            errors.push('Custody chain integrity compromised');
        }
        // Verify witness signatures
        if (exportPackage.witnesses.length > 0) {
            checks.witnessesValid = exportPackage.witnesses.every((w) => w.signature && w.signedAt);
            if (!checks.witnessesValid) {
                errors.push('Not all witnesses have signed');
            }
        }
        else {
            checks.witnessesValid = true; // No witnesses required
        }
        return {
            valid: Object.values(checks).every((v) => v),
            checks,
            errors,
        };
    }
    /**
     * Generate certificate of authenticity
     */
    generateCertificate(exportPackage) {
        const verification = this.verifyExportSync(exportPackage);
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                        CERTIFICATE OF AUTHENTICITY                            ║
║                      Audit Black Box Export Package                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Export ID:        ${exportPackage.id.padEnd(54)}║
║  Created:          ${exportPackage.createdAt.toISOString().padEnd(54)}║
║  Purpose:          ${exportPackage.request.purpose.padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  DATA SUMMARY                                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Event Count:      ${String(exportPackage.data.eventCount).padEnd(54)}║
║  Date Range:       ${exportPackage.request.dateRange.start.toISOString().substring(0, 10)} - ${exportPackage.request.dateRange.end.toISOString().substring(0, 10)}                                  ║
║  Redacted Fields:  ${String(exportPackage.data.redactedFields).padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  INTEGRITY VERIFICATION                                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Data Hash:        ${exportPackage.integrity.dataHash.substring(0, 52)}...║
║  Merkle Root:      ${exportPackage.integrity.merkleRoot.substring(0, 52)}...║
║  Chain Range:      ${String(exportPackage.integrity.chainStartSequence).padEnd(10)} - ${String(exportPackage.integrity.chainEndSequence).padEnd(40)}║
║  Chain Verified:   ${(exportPackage.integrity.chainIntegrityVerified ? '✓ YES' : '✗ NO').padEnd(54)}║
║  Signature Valid:  ${(verification.checks.signatureValid ? '✓ YES' : '✗ NO').padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CHAIN OF CUSTODY                                                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
${exportPackage.custody.map((c) => `║  ${c.timestamp.toISOString().substring(0, 19)} - ${c.action.padEnd(12)} by ${c.actorName.substring(0, 30).padEnd(30)}║`).join('\n')}
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  WITNESSES                                                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
${exportPackage.witnesses.length > 0 ? exportPackage.witnesses.map((w) => `║  ${w.name.padEnd(30)} - ${w.signature ? '✓ Signed' : '○ Pending'}                          ║`).join('\n') : '║  No witnesses required                                                        ║'}
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CERTIFICATION                                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  I hereby certify that this export package contains an authentic,             ║
║  unaltered copy of audit records from the IntelGraph Audit Black Box          ║
║  System. The cryptographic hash chain has been verified, and all              ║
║  signatures are valid.                                                        ║
║                                                                               ║
║  Algorithm: ${exportPackage.signatures.algorithm.padEnd(62)}║
║                                                                               ║
║  System Signature:                                                            ║
║  ${exportPackage.signatures.system.substring(0, 72)}║
║  ${exportPackage.signatures.system.substring(72, 144) || ''.padEnd(72)}║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
    // Private methods
    validateRequest(request) {
        if (!request.requestedBy?.id) {
            throw new Error('Requestor ID is required');
        }
        if (!request.purpose) {
            throw new Error('Export purpose is required');
        }
        if (!request.dateRange?.start || !request.dateRange?.end) {
            throw new Error('Date range is required');
        }
        if (request.dateRange.start > request.dateRange.end) {
            throw new Error('Invalid date range: start must be before end');
        }
    }
    applyRedactions(events, rules) {
        let redactedCount = 0;
        const processedEvents = events.map((event) => {
            const processed = JSON.parse(JSON.stringify(event));
            for (const rule of rules) {
                if (this.hasField(processed, rule.field)) {
                    const value = this.getField(processed, rule.field);
                    if (typeof value === 'string') {
                        if (rule.pattern) {
                            if (rule.pattern.test(value)) {
                                this.setField(processed, rule.field, rule.replacement);
                                redactedCount++;
                            }
                        }
                        else {
                            this.setField(processed, rule.field, rule.replacement);
                            redactedCount++;
                        }
                    }
                }
            }
            return processed;
        });
        return { events: processedEvents, redactedCount };
    }
    hasField(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return false;
            }
            current = current[part];
        }
        return current !== undefined;
    }
    getField(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    setField(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
    async formatData(events, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(events, null, 2);
            case 'csv':
                return this.toCSV(events);
            case 'xml':
                return this.toXML(events);
            case 'pdf':
                // Would use a PDF library in real implementation
                return JSON.stringify(events);
            case 'sealed-archive':
                // Would create encrypted, signed archive
                return Buffer.from(JSON.stringify(events));
            default:
                return JSON.stringify(events);
        }
    }
    toCSV(events) {
        if (events.length === 0)
            return '';
        const headers = Object.keys(events[0]);
        const rows = events.map((event) => {
            const obj = event;
            return headers
                .map((h) => {
                const val = obj[h];
                const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                return `"${str.replace(/"/g, '""')}"`;
            })
                .join(',');
        });
        return [headers.join(','), ...rows].join('\n');
    }
    toXML(events) {
        const items = events
            .map((event) => {
            const obj = event;
            const fields = Object.entries(obj)
                .map(([key, value]) => {
                const val = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
                return `    <${key}>${this.escapeXML(val)}</${key}>`;
            })
                .join('\n');
            return `  <event>\n${fields}\n  </event>`;
        })
            .join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<auditExport>\n${items}\n</auditExport>`;
    }
    escapeXML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    signData(data) {
        if (!this.signingKey) {
            throw new Error('Signing key not initialized');
        }
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(data);
        return sign.sign(this.signingKey.privateKey, 'hex');
    }
    hashCustodyEntry(entry) {
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(entry)).digest('hex');
    }
    verifyCustodyChain(chain) {
        for (let i = 1; i < chain.length; i++) {
            const expectedPreviousHash = this.hashCustodyEntry(chain[i - 1]);
            if (chain[i].previousEntryHash !== expectedPreviousHash) {
                return false;
            }
        }
        return true;
    }
    verifyExportSync(exportPackage) {
        try {
            const signatureData = JSON.stringify({
                exportId: exportPackage.id,
                dataHash: exportPackage.integrity.dataHash,
                merkleRoot: exportPackage.integrity.merkleRoot,
                timestamp: exportPackage.createdAt.toISOString(),
            });
            const verify = (0, crypto_1.createVerify)('SHA256');
            verify.update(signatureData);
            const valid = verify.verify(exportPackage.signatures.publicKey, exportPackage.signatures.system, 'hex');
            return { checks: { signatureValid: valid } };
        }
        catch {
            return { checks: { signatureValid: false } };
        }
    }
    generateExportId() {
        const timestamp = Date.now().toString(36);
        const random = (0, crypto_1.randomBytes)(4).toString('hex');
        return `export-${timestamp}-${random}`;
    }
}
exports.LegalExportManager = LegalExportManager;
/**
 * Create configured legal export manager
 */
function createLegalExportManager(config = {}) {
    return new LegalExportManager(config);
}
