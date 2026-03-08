"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportServiceV2 = void 0;
const pino_1 = __importDefault(require("pino"));
const DisclosurePackager_js_1 = require("./DisclosurePackager.js");
const log = pino_1.default({ name: 'ReportServiceV2' });
class ReportServiceV2 {
    packager = new DisclosurePackager_js_1.DisclosurePackager();
    async createReport(req) {
        // 1. Enforce "Citations or Block"
        this.validateCitations(req);
        // 2. Auto-insert CH/COI
        const finalSections = [...req.sections];
        if (req.ch && req.ch.length > 0) {
            finalSections.push({
                title: 'Analysis of Competing Hypotheses',
                type: 'table',
                content: JSON.stringify(req.ch) // Simplified
            });
        }
        if (req.coi && req.coi.length > 0) {
            finalSections.push({
                title: 'Conflicts of Interest / Disclosure',
                type: 'text',
                content: req.coi.join('\n')
            });
        }
        // 3. Generate Manifest
        // Mock evidence retrieval based on citations
        const evidenceItems = req.citations.map(c => ({
            id: c.evidenceId,
            content: c.text, // In reality, fetch from DB
            source: 'Internal DB',
            timestamp: new Date().toISOString()
        }));
        const manifest = this.packager.createManifest(evidenceItems, 'https://compliance.intelgraph.io/reply');
        const report = {
            title: req.title,
            sections: finalSections,
            generatedAt: new Date().toISOString()
        };
        // 4. Persistence (Simulation)
        await this.persistReport(report, manifest);
        return { report, manifest };
    }
    validateCitations(req) {
        if (!req.citations || req.citations.length === 0) {
            throw new Error("BLOCK: Publication blocked. No citations provided for claims.");
        }
        for (const cit of req.citations) {
            if (!cit.evidenceId) {
                throw new Error("BLOCK: Invalid citation detected.");
            }
        }
    }
    async persistReport(report, manifest) {
        // TODO: Integrate with PostgreSQL 'reports' and 'provenance_manifests' tables
        // const pool = getPostgresPool();
        // await pool.query('INSERT INTO reports ...');
        log.info({ reportTitle: report.title, manifestRoot: manifest.rootHash }, 'PERSISTENCE: Report and Manifest saved to database (Simulated)');
    }
}
exports.ReportServiceV2 = ReportServiceV2;
