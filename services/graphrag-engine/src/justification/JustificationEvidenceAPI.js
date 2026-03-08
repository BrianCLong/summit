"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JustificationEvidenceAPI = void 0;
const ProofExtractor_js_1 = require("./ProofExtractor.js");
class JustificationEvidenceAPI {
    driver;
    registry;
    constructor(driver, registry) {
        this.driver = driver;
        this.registry = registry;
    }
    async fetchProof(queryId, params) {
        const queryMeta = this.registry.queries.find(q => q.id === queryId);
        if (!queryMeta) {
            throw new Error(`Query ${queryId} not found in registry`);
        }
        if (queryMeta.phase !== 'JUSTIFICATION') {
            throw new Error(`Query ${queryId} is not a JUSTIFICATION query`);
        }
        const session = this.driver.session();
        try {
            const result = await session.run(queryMeta.cypher, params);
            return ProofExtractor_js_1.ProofExtractor.extract(result.records);
        }
        finally {
            await session.close();
        }
    }
}
exports.JustificationEvidenceAPI = JustificationEvidenceAPI;
