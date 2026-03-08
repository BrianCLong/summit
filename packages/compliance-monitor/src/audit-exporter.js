"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditExporter = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const narrative_generator_js_1 = require("./narrative-generator.js");
class AuditExporter {
    registry;
    runner;
    evidenceStore;
    exceptions;
    narratives;
    constructor(options) {
        this.registry = options.registry;
        this.runner = options.runner;
        this.evidenceStore = options.evidenceStore;
        this.exceptions = options.exceptions;
        this.narratives = options.narratives || new narrative_generator_js_1.NarrativeGenerator();
    }
    async exportBundle(outputDir) {
        await promises_1.default.mkdir(outputDir, { recursive: true });
        const controls = this.registry.list();
        const controlsPath = path_1.default.join(outputDir, 'controls.json');
        await promises_1.default.writeFile(controlsPath, JSON.stringify(controls, null, 2));
        const evidencePath = path_1.default.join(outputDir, 'evidence.json');
        const allEvidence = await Promise.all(controls.map(control => this.evidenceStore.listEvidence(control.id)));
        const flatEvidence = allEvidence.flat();
        await promises_1.default.writeFile(evidencePath, JSON.stringify(flatEvidence.map(record => ({ ...record, createdAt: record.createdAt.toISOString() })), null, 2));
        const narrativesPath = path_1.default.join(outputDir, 'narratives.md');
        const narrativeDocs = await Promise.all(controls.map(async (control) => {
            const evidence = await this.evidenceStore.latest(control.id);
            return this.narratives.build(control, evidence);
        }));
        await promises_1.default.writeFile(narrativesPath, narrativeDocs.join('\n\n---\n\n'));
        const exceptionsPath = path_1.default.join(outputDir, 'exceptions.json');
        await promises_1.default.writeFile(exceptionsPath, JSON.stringify(this.exceptions.list(), null, 2));
        const manifest = {
            generatedAt: new Date(),
            controlsCount: controls.length,
            evidenceCount: flatEvidence.length,
            exceptions: this.exceptions.list().length,
            artifacts: [controlsPath, evidencePath, narrativesPath, exceptionsPath],
        };
        await promises_1.default.writeFile(path_1.default.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        return manifest;
    }
}
exports.AuditExporter = AuditExporter;
