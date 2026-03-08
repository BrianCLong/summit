"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = void 0;
// @ts-nocheck
const connectors_js_1 = require("../ingestion/connectors.js");
const database_js_1 = require("../../config/database.js");
const EmbeddingService_js_1 = require("../../services/EmbeddingService.js");
class IngestionService {
    static instance;
    embeddingService; // Using existing JS service
    constructor() {
        this.embeddingService = new EmbeddingService_js_1.EmbeddingService(); // Assuming it's a class we can instantiate or use singleton
    }
    static getInstance() {
        if (!IngestionService.instance) {
            IngestionService.instance = new IngestionService();
        }
        return IngestionService.instance;
    }
    async ingestExternal(source, query, tenantId) {
        const connector = connectors_js_1.ConnectorFactory.getConnector(source);
        // Fetch Data
        const patents = await connector.fetchPatents(query);
        const papers = await connector.fetchPapers(query);
        // Process & Persist
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        let patentCount = 0;
        let paperCount = 0;
        try {
            for (const p of patents) {
                // Generate embedding
                const text = `${p.title} ${p.abstract} ${(p.claims || []).join(' ')}`;
                const embedding = await this.embeddingService.getEmbedding(text);
                await session.run(`
          MERGE (p:Patent {patentNumber: $patentNumber})
          SET p += $props, p.embedding = $embedding, p.tenantId = $tenantId, p:AureliusNode
        `, {
                    patentNumber: p.patentNumber,
                    props: { ...p, claims: p.claims }, // Ensure arrays are handled
                    embedding,
                    tenantId
                });
                patentCount++;
            }
            for (const p of papers) {
                const text = `${p.title} ${p.abstract}`;
                const embedding = await this.embeddingService.getEmbedding(text);
                await session.run(`
           MERGE (p:ResearchPaper {doi: $doi})
           SET p += $props, p.embedding = $embedding, p.tenantId = $tenantId, p:AureliusNode
         `, {
                    doi: p.doi,
                    props: p,
                    embedding,
                    tenantId
                });
                paperCount++;
            }
        }
        finally {
            await session.close();
        }
        return { patents: patentCount, papers: paperCount };
    }
    async ingestInternalArtifact(artifactType, content, tenantId) {
        // Ingest generic internal text (e.g. from Maestro) as a 'Concept' or 'CompetitionSignal'
        // dependent on classification. For now, we'll map simple text to a Concept node.
        const embedding = await this.embeddingService.getEmbedding(content);
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            await session.run(`
            CREATE (c:Concept {
                id: randomUUID(),
                name: $name,
                description: $content,
                source: 'INTERNAL',
                artifactType: $artifactType,
                tenantId: $tenantId,
                embedding: $embedding
            })
            SET c:AureliusNode
          `, {
                name: `Internal Artifact - ${new Date().toISOString()}`,
                content,
                artifactType,
                tenantId,
                embedding
            });
        }
        finally {
            await session.close();
        }
    }
}
exports.IngestionService = IngestionService;
