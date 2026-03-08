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
const DiscoveryRetriever_1 = require("../../services/graphrag-engine/src/discovery/DiscoveryRetriever");
const JustificationEvidenceAPI_1 = require("../../services/graphrag-engine/src/justification/JustificationEvidenceAPI");
const DeliberationEngine_1 = require("../../services/graphrag-engine/src/deliberation/DeliberationEngine");
const EvidenceWriter_1 = require("../../services/graphrag-engine/src/evidence/EvidenceWriter");
const answering_1 = require("../../services/graphrag-engine/src/policies/answering");
const index_1 = require("../../packages/graphrag-core/src/query_registry/index");
const fs = __importStar(require("fs"));
async function main() {
    // Mock driver and session for offline eval
    const mockSession = {
        run: async (cypher) => {
            if (cypher.includes('SUPPORTED_BY')) {
                return {
                    records: [
                        {
                            forEach: (cb) => {
                                cb({ labels: ['Entity'], properties: { id: 'e1', evidence_id: 'EVID-1' } });
                                cb({ labels: ['Entity'], properties: { id: 'e2', evidence_id: 'EVID-1' } });
                                cb({ type: 'SUPPORTED_BY', start: 'e1', end: 'e2', properties: {} });
                            }
                        }
                    ]
                };
            }
            return {
                records: [
                    {
                        get: (key) => {
                            if (key === 'entityId')
                                return 'e1';
                            if (key === 'pathNodes')
                                return [{}, {}];
                            return null;
                        },
                    }
                ]
            };
        },
        close: async () => { }
    };
    const mockDriver = {
        session: () => mockSession,
        close: async () => { }
    };
    const registryData = JSON.parse(fs.readFileSync('packages/graphrag-core/src/query_registry/registry.json', 'utf8'));
    const registry = index_1.RegistryLoader.validate(registryData);
    const discovery = new DiscoveryRetriever_1.DiscoveryRetriever(mockDriver);
    const justification = new JustificationEvidenceAPI_1.JustificationEvidenceAPI(mockDriver, registry);
    const policy = new answering_1.AnsweringPolicy({ minRobustness: 0.1, minEvidenceDiversity: 1 });
    const evidenceWriter = new EvidenceWriter_1.EvidenceWriter({ outputDir: 'evidence/eval-repro', runId: 'eval-run', gitShortSha: 'test-sha' });
    console.log('Running Discovery...');
    const discoResult = await discovery.discover('Who is Alpha?', ['seed1'], { maxHops: 2, maxCandidates: 1, timeoutMs: 1000 });
    console.log('Running Justification...');
    const proof = await justification.fetchProof('justification-proof', { id: 'e1', max_rows: 5 });
    console.log('Running Deliberation...');
    const deliberation = DeliberationEngine_1.DeliberationEngine.deliberate([{ explanation: discoResult.candidates[0], proof }]);
    const decision = policy.shouldRefuse(deliberation);
    if (decision.refuse) {
        console.log('Policy Refused:', decision.reason);
    }
    else {
        console.log('Policy Approved. Writing Artifacts...');
        const evid = evidenceWriter.writeArtifacts(deliberation, { latency: 150 });
        console.log('Artifacts written to:', evid);
    }
}
main().catch(console.error);
