"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cetResolvers = void 0;
const SELF = process.env.SELF_BASE_URL || 'http://localhost:4000';
async function j(method, path, body) {
    const res = await fetch(SELF + path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return data;
}
exports.cetResolvers = {
    Query: {
        caseById: async (_, { id }, _ctx) => (await j('GET', `/cases/${id}`)).case,
        caseExport: async (_, { id }) => (await j('GET', `/cases/${id}/export`)).bundle,
        evidenceAnnotations: async (_, { id }) => (await j('GET', `/evidence/${id}/annotations`)).items,
        triageSuggestions: async () => (await j('GET', `/triage/suggestions`)).items,
    },
    Mutation: {
        createCase: async (_, { title }) => (await j('POST', '/cases', { title })).case,
        approveCase: async (_, { id }) => (await j('POST', `/cases/${id}/approve`)).case,
        annotateEvidence: async (_, { id, range, note }) => (await j('POST', `/evidence/${id}/annotations`, { range, note }))
            .annotation,
        triageSuggest: async (_, { type, data }) => (await j('POST', '/triage/suggestions', { type, data })).suggestion,
        triageApprove: async (_, { id }) => (await j('POST', `/triage/suggestions/${id}/approve`)).suggestion,
        triageMaterialize: async (_, { id }) => (await j('POST', `/triage/suggestions/${id}/materialize`)).suggestion,
    },
};
