"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEntities = extractEntities;
const modelCache = new Map();
async function loadModel(lang) {
    const cached = modelCache.get(lang);
    if (cached) {
        return cached;
    }
    const modelPromise = Promise.resolve({
        pipe: async (text) => basicEntityHeuristics(text),
    });
    modelCache.set(lang, modelPromise);
    return modelPromise;
}
function basicEntityHeuristics(text) {
    const entities = [];
    const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
    let match;
    while ((match = entityPattern.exec(text)) !== null) {
        const [matchedText] = match;
        const start = match.index;
        const end = start + matchedText.length;
        entities.push({
            text: matchedText,
            label: 'ENTITY',
            start,
            end,
            confidence: 0.5,
        });
    }
    return entities;
}
async function extractEntities(text, lang) {
    const nlp = await loadModel(lang);
    const result = await nlp.pipe(text);
    return result;
}
