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
exports.releaseReadinessService = exports.ReleaseReadinessService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
class ReleaseReadinessService {
    repoRoot;
    cachedSummary;
    cachedEvidenceIndex;
    cacheExpiry = 5 * 60 * 1000; // 5 minutes
    lastCacheTime = 0;
    constructor(repoRoot = process.cwd()) {
        this.repoRoot = repoRoot;
    }
    /**
     * Parse CONTROL_REGISTRY.md into structured control mappings
     */
    async parseControlRegistry() {
        const filePath = path_1.default.join(this.repoRoot, 'docs/compliance/CONTROL_REGISTRY.md');
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const controls = [];
            // Parse markdown table (skip header rows)
            const lines = content.split('\n');
            let inTable = false;
            for (const line of lines) {
                if (line.includes('| Control ID | Control Name |')) {
                    inTable = true;
                    continue;
                }
                if (line.includes('| :---')) {
                    continue;
                }
                if (inTable && line.startsWith('|') && !line.includes('**GOV-') && !line.includes('**SEC-') && !line.includes('**OPS-') && !line.includes('**RISK-') && !line.includes('**AI-')) {
                    // End of table
                    if (!line.trim().match(/\|\s*\*\*/)) {
                        break;
                    }
                }
                if (inTable && line.startsWith('|')) {
                    const parts = line.split('|').map((p) => p.trim()).filter((p) => p);
                    if (parts.length >= 5) {
                        const idMatch = parts[0].match(/\*\*([A-Z]+-\d+)\*\*/);
                        if (idMatch) {
                            controls.push({
                                id: idMatch[1],
                                name: parts[1],
                                description: parts[2],
                                enforcementPoint: parts[3],
                                evidenceArtifact: parts[4],
                            });
                        }
                    }
                }
            }
            return controls;
        }
        catch (error) {
            logger_js_1.default.error('Failed to parse CONTROL_REGISTRY.md', error);
            throw error;
        }
    }
    /**
     * Parse EVIDENCE_INDEX.md into structured evidence items
     */
    async parseEvidenceIndex() {
        const filePath = path_1.default.join(this.repoRoot, 'docs/compliance/EVIDENCE_INDEX.md');
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const evidence = [];
            // Parse markdown table
            const lines = content.split('\n');
            let inTable = false;
            for (const line of lines) {
                if (line.includes('| Control ID | Control Name |')) {
                    inTable = true;
                    continue;
                }
                if (line.includes('| :---')) {
                    continue;
                }
                if (inTable && line.startsWith('|')) {
                    const parts = line.split('|').map((p) => p.trim()).filter((p) => p);
                    if (parts.length >= 5) {
                        const idMatch = parts[0].match(/\*\*([A-Z]+-\d+)\*\*/);
                        if (idMatch) {
                            evidence.push({
                                controlId: idMatch[1],
                                controlName: parts[1],
                                evidenceType: parts[2],
                                location: parts[3],
                                verificationCommand: parts[4],
                            });
                        }
                    }
                }
            }
            return evidence;
        }
        catch (error) {
            logger_js_1.default.error('Failed to parse EVIDENCE_INDEX.md', error);
            throw error;
        }
    }
    /**
     * Check if critical governance files exist
     */
    async checkGovernanceFiles() {
        const checks = [];
        const requiredFiles = [
            { path: 'docs/governance/CONSTITUTION.md', name: 'Constitutional Governance' },
            { path: 'docs/compliance/CONTROL_REGISTRY.md', name: 'Control Registry' },
            { path: 'docs/compliance/EVIDENCE_INDEX.md', name: 'Evidence Index' },
            { path: 'SECURITY.md', name: 'Security Policy' },
            { path: 'CODE_OF_CONDUCT.md', name: 'Code of Conduct' },
        ];
        for (const file of requiredFiles) {
            const filePath = path_1.default.join(this.repoRoot, file.path);
            try {
                await promises_1.default.access(filePath);
                checks.push({
                    id: `file-${file.path.replace(/[\/\.]/g, '-')}`,
                    name: file.name,
                    status: 'pass',
                    lastRunAt: new Date().toISOString(),
                    evidenceLinks: [file.path],
                });
            }
            catch {
                checks.push({
                    id: `file-${file.path.replace(/[\/\.]/g, '-')}`,
                    name: file.name,
                    status: 'fail',
                    lastRunAt: new Date().toISOString(),
                    evidenceLinks: [file.path],
                });
            }
        }
        return checks;
    }
    /**
     * Get release readiness summary (cached)
     */
    async getSummary() {
        const now = Date.now();
        // Return cached if still valid
        if (this.cachedSummary && (now - this.lastCacheTime) < this.cacheExpiry) {
            return this.cachedSummary;
        }
        // Get git commit hash for version tracking
        let versionOrCommit = 'unknown';
        try {
            const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
            versionOrCommit = execSync('git rev-parse --short HEAD', {
                cwd: this.repoRoot,
                encoding: 'utf-8'
            }).trim();
        }
        catch {
            // Git not available or not a git repo
            versionOrCommit = 'no-git';
        }
        // Run readiness checks
        const checks = await this.checkGovernanceFiles();
        // Determine overall status
        const failCount = checks.filter(c => c.status === 'fail').length;
        const warnCount = checks.filter(c => c.status === 'warn').length;
        this.cachedSummary = {
            generatedAt: new Date().toISOString(),
            versionOrCommit,
            checks,
        };
        this.lastCacheTime = now;
        return this.cachedSummary;
    }
    /**
     * Get evidence index (cached)
     */
    async getEvidenceIndex() {
        const now = Date.now();
        // Return cached if still valid
        if (this.cachedEvidenceIndex && (now - this.lastCacheTime) < this.cacheExpiry) {
            return this.cachedEvidenceIndex;
        }
        const [controls, evidence] = await Promise.all([
            this.parseControlRegistry(),
            this.parseEvidenceIndex(),
        ]);
        this.cachedEvidenceIndex = { controls, evidence };
        this.lastCacheTime = now;
        return this.cachedEvidenceIndex;
    }
    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.cachedSummary = undefined;
        this.cachedEvidenceIndex = undefined;
        this.lastCacheTime = 0;
    }
}
exports.ReleaseReadinessService = ReleaseReadinessService;
// Singleton instance
exports.releaseReadinessService = new ReleaseReadinessService();
