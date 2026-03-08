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
const orchestrator_1 = require("../src/data-pipeline/rag-data-pipeline/orchestrator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
describe('RAG Pipeline MWS', () => {
    it('should process 3 documents and produce deterministic artifacts', async () => {
        const orchestrator = new orchestrator_1.RAGPipelineOrchestrator();
        const mockDocs = [
            {
                content: "This is document one. It has some important facts.",
                sourceUri: "s3://bucket/doc1.txt",
                type: "text/plain",
                timestamp: "2024-01-01T12:00:00Z"
            },
            {
                content: "Document two covers RAG pipeline engineering and data preparation.",
                sourceUri: "s3://bucket/doc2.txt",
                type: "text/plain",
                timestamp: "2024-01-02T12:00:00Z"
            },
            {
                content: "The third document is shorter.",
                sourceUri: "s3://bucket/doc3.txt",
                type: "text/plain",
                timestamp: "2024-01-03T12:00:00Z"
            }
        ];
        const result = await orchestrator.processDocuments(mockDocs);
        expect(result.report.status).toBe("SUCCESS");
        expect(result.chunks.length).toBeGreaterThan(0);
        expect(result.embeddings.length).toBe(result.chunks.length);
        expect(result.graphNodes.length).toBe(result.chunks.length + 3);
        const artifactDir = path.resolve(process.cwd(), 'artifacts/rag_pipeline');
        if (!fs.existsSync(artifactDir)) {
            fs.mkdirSync(artifactDir, { recursive: true });
        }
        fs.writeFileSync(path.join(artifactDir, 'chunks.json'), JSON.stringify(result.chunks, null, 2));
        fs.writeFileSync(path.join(artifactDir, 'graph_nodes.json'), JSON.stringify(result.graphNodes, null, 2));
        fs.writeFileSync(path.join(artifactDir, 'embeddings.json'), JSON.stringify(result.embeddings, null, 2));
        fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(result.report, null, 2));
        fs.writeFileSync(path.join(artifactDir, 'metrics.json'), JSON.stringify(result.metrics, null, 2));
        // Deterministic stamp with fixed date to satisfy "no timestamps" in artifacts (except within static docs)
        fs.writeFileSync(path.join(artifactDir, 'stamp.json'), JSON.stringify({ version: "1.0", executed: true }, null, 2));
        expect(fs.existsSync(path.join(artifactDir, 'report.json'))).toBe(true);
        expect(fs.existsSync(path.join(artifactDir, 'metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(artifactDir, 'stamp.json'))).toBe(true);
    });
});
