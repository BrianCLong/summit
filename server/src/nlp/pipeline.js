"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTestSetPath = exports.TextIngestionPipeline = void 0;
exports.loadDomainTestSet = loadDomainTestSet;
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const resolution_js_1 = require("./resolution.js");
const relationships_js_1 = require("./relationships.js");
const transformers_js_1 = require("./transformers.js");
const graph_updater_js_1 = require("./graph_updater.js");
class KafkaMessageParser {
    parseMessage(raw) {
        try {
            return JSON.parse(raw.toString());
        }
        catch (error) {
            return { text: raw.toString(), error: error.message };
        }
    }
}
function normalizePayload(payload) {
    const trimmed = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'string') {
            trimmed[key] = value.trim();
        }
        else {
            trimmed[key] = value;
        }
    });
    return trimmed;
}
class TextIngestionPipeline {
    kafka;
    inference;
    disambiguator;
    relationshipExtractor;
    graphUpdater;
    constructor(options = {}) {
        this.kafka = new KafkaMessageParser();
        this.inference = new transformers_js_1.TransformerInferenceService({ modelName: options.modelName });
        this.disambiguator = new resolution_js_1.ContextDisambiguator();
        this.relationshipExtractor = new relationships_js_1.ImplicitRelationshipExtractor();
        this.graphUpdater = new graph_updater_js_1.GraphUpdater();
    }
    async ingestHttp(payload, tenantId = 'default', language = 'en') {
        return {
            id: (0, uuid_1.v4)(),
            source: 'http',
            payload: normalizePayload(payload),
            receivedAt: new Date().toISOString(),
            tenantId,
            language
        };
    }
    async ingestKafka(raw, tenantId = 'default') {
        const parsed = this.kafka.parseMessage(raw);
        return {
            id: (0, uuid_1.v4)(),
            source: 'kafka',
            payload: normalizePayload(parsed),
            receivedAt: new Date().toISOString(),
            tenantId
        };
    }
    async ingestFile(filePath, tenantId = 'default') {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const rows = content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        return rows.map((line) => ({
            id: (0, uuid_1.v4)(),
            source: 'file',
            payload: { text: line },
            receivedAt: new Date().toISOString(),
            tenantId
        }));
    }
    async process(doc) {
        const normalized = normalizePayload(doc.payload);
        const context = this.inference.toContextString(normalized);
        // 1. NER & Initial Parsing (Python Script via TransformerInferenceService)
        const annotations = await this.inference.annotate({ context, coref: {}, language: doc.language }); // coref passed empty initially
        const entities = annotations.entities || [];
        const structuredRelationships = annotations.relationships || [];
        // 2. Clustering & Resolution
        const clusteredEntities = this.disambiguator.clusterEntities(entities);
        // 3. Disambiguation (using clusters)
        // Pass known entities if any found in annotation to help resolution
        const coref = await this.disambiguator.resolve(context, clusteredEntities);
        // 4. Enhanced Relationship Extraction (Merging Structured + Implicit)
        const relationships = this.relationshipExtractor.extract(context, coref, structuredRelationships);
        // 5. Update Knowledge Graph
        if (doc.tenantId) {
            // Ensure graphUpdater is ready/available (mock safe)
            if (this.graphUpdater && typeof this.graphUpdater.updateGraph === 'function') {
                await this.graphUpdater.updateGraph(doc.tenantId, clusteredEntities, relationships, doc.id || 'unknown');
            }
        }
        return {
            id: doc.id || (0, uuid_1.v4)(),
            normalized,
            context,
            annotations,
            entities: clusteredEntities,
            relationships,
        };
    }
    async batchProcess(docs) {
        const seen = new Set();
        const uniqueDocs = docs.filter((doc) => {
            const key = JSON.stringify(doc.payload);
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        return Promise.all(uniqueDocs.map((doc) => this.process(doc)));
    }
}
exports.TextIngestionPipeline = TextIngestionPipeline;
exports.defaultTestSetPath = path_1.default.join(__dirname, '..', '..', 'data', 'domain-test-set.json');
function loadDomainTestSet(filePath = exports.defaultTestSetPath) {
    if (!fs_1.default.existsSync(filePath)) {
        return [];
    }
    const raw = fs_1.default.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}
