"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagContextBuilder = void 0;
exports.getRagContext = getRagContext;
exports.fetchGraphContext = fetchGraphContext;
exports.fetchTextPassages = fetchTextPassages;
exports.buildRagPrompt = buildRagPrompt;
// Mock for services/rag
const RagContextBuilder = class {
    async buildContext(_query, _retrievalResult) {
        return 'Mock RAG context';
    }
};
exports.RagContextBuilder = RagContextBuilder;
async function getRagContext(_query, _tenantId, _embedding) {
    return 'Mock RAG context';
}
async function fetchGraphContext(_query, _options) {
    return [];
}
async function fetchTextPassages(_query, _options) {
    return [];
}
function buildRagPrompt(_graphContext, _textPassages, _userQuery) {
    return 'Mock RAG prompt';
}
exports.default = {
    RagContextBuilder: exports.RagContextBuilder,
    getRagContext,
    fetchGraphContext,
    fetchTextPassages,
    buildRagPrompt,
};
