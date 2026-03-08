"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndRetrieve = verifyAndRetrieve;
const flags_1 = require("./flags");
const citation_resolver_1 = require("./citation_resolver");
async function verifyAndRetrieve(query, retrievalFn, generationFn, maxRetries = 2) {
    // If feature flag is off, just execute standard RAG
    if (!flags_1.FEATURE_FLAGS.VERIFIER_LOOP_ENABLED) {
        const chunks = await retrievalFn(query);
        return generationFn(query, chunks);
    }
    let attempt = 0;
    while (attempt <= maxRetries) {
        const chunks = await retrievalFn(query);
        const answer = await generationFn(query, chunks);
        // Check citation/groundedness mapping
        const isValid = (0, citation_resolver_1.resolveCitations)(answer, chunks);
        if (isValid) {
            return answer;
        }
        attempt++;
    }
    return "I'm sorry, I could not find supported evidence to answer this query.";
}
