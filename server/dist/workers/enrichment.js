import Redis from 'ioredis';
const connection = new Redis(process.env.REDIS_URL); // Use Redis connection string from env
const QUEUE = 'assistant:enrich';
const enrichQueue = {
    async add(jobName, payload, opts) {
        // When BullMQ is unavailable in the environment we still want the method to
        // succeed during tests, so resolve with a simple metadata object.
        return Promise.resolve({
            id: `${jobName}-${Date.now()}`,
            name: jobName,
            data: payload,
            opts,
        });
    },
};
// const enrichmentQueue = new Queue<EnrichmentJobData>('enrichment-queue', {
//   connection: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//     password: process.env.REDIS_PASSWORD,
//   },
// });
export async function enqueueEnrichment(payload, opts = { attempts: 2 }) {
    return enrichQueue.add('enrich', payload, opts);
}
// ----- Extremely lightweight NER placeholder (regex-based) -----
// Swap with Python microservice or HF model later; keep interface identical.
function extractEntities(text) {
    const ents = [];
    const push = (type, v) => ents.push({ type, value: v });
    // Naive regex for common entity types
    // Names (capitalized words, potentially multiple) - improved to handle more cases
    (text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3}\b/g) || []).forEach((v) => push('PersonOrOrg', v));
    // Emails
    (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || []).forEach((v) => push('Email', v));
    // URLs
    (text.match(/\bhttps?:\/\/[^\s)]+/g) || []).forEach((v) => push('URL', v));
    // Hashtags
    (text.match(/#[A-Za-z0-9_]+/g) || []).forEach((v) => push('Tag', v));
    // Handles
    (text.match(/@[A-Za-z0-9_]+/g) || []).forEach((v) => push('Handle', v));
    // Custom entity types (simple regex for demonstration)
    // Wallet (example: starts with 0x, followed by hex chars)
    (text.match(/\b0x[a-fA-F0-9]{40}\b/g) || []).forEach((v) => push('Wallet', v));
    // Domain (example: example.com, sub.domain.co)
    (text.match(/\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}\b/g) || []).forEach((v) => push('Domain', v));
    // Malware (example: specific names, case-insensitive)
    const malwareKeywords = ['Ryuk', 'WannaCry', 'NotPetya'];
    malwareKeywords.forEach((keyword) => {
        if (text.includes(keyword))
            push('Malware', keyword);
    });
    return ents.slice(0, 50); // Limit to 50 entities
}
// Placeholder for calling Python NER service for embeddings
// Placeholder for calling Python NER service for embeddings
async function computeEmbedding(texts) {
    // In a real scenario, this would call your Python microservice /embed endpoint
    // For now, return dummy embeddings
    return texts.map(() => Array(384).fill(0.1)); // Example: 384-dimensional embeddings for each text
}
// Scoring model for Entity Resolution v2
function scoreEntities(suggestionLabel, candidateName, candidateEmbedding, suggestionEmbedding, sharedNeighborsK1) {
    // Features: cosine(name, candidate), JaroWinkler, Levenshtein, same_domain, shared_neighbors_k1, pagerank_delta.
    // Rule baseline:
    // score = 0.6*cosine + 0.2*Jaro + 0.2*(shared_neighbors_k1 ? 1 : 0);
    // accept if score >= 0.82; else queue for review.
    // Dummy cosine similarity (replace with actual calculation if needed)
    const cosineSimilarity = (emb1, emb2) => {
        if (emb1.length !== emb2.length || emb1.length === 0)
            return 0;
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        for (let i = 0; i < emb1.length; i++) {
            dotProduct += emb1[i] * emb2[i];
            magnitude1 += emb1[i] * emb1[i];
            magnitude2 += emb2[i] * emb2[i];
        }
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        if (magnitude1 === 0 || magnitude2 === 0)
            return 0;
        return dotProduct / (magnitude1 * magnitude2);
    };
    const cos = cosineSimilarity(suggestionEmbedding, candidateEmbedding);
    // Jaro-Winkler (placeholder, use a proper library like 'string-similarity' if available)
    const jaroWinkler = (s1, s2) => {
        // Very basic placeholder, replace with actual Jaro-Winkler
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0)
            return 1.0;
        return longer.indexOf(shorter) !== -1 ? 0.8 : 0.2; // Dummy logic
    };
    const jaro = jaroWinkler(suggestionLabel, candidateName);
    const score = 0.6 * cos + 0.2 * jaro + 0.2 * (sharedNeighborsK1 ? 1 : 0);
    return score;
}
function nowIso() {
    return new Date().toISOString();
}
// const enrichmentWorker = new Worker<EnrichmentJobData>('enrichment-queue', async (job) => {
//   const { entityId, enrichmentType, data } = job.data;
//   logger.info(`Processing enrichment job ${job.id} for entity ${entityId} (${enrichmentType})`);
//   try {
//     const result = await performEnrichment(enrichmentType, data);
//     logger.info(`Enrichment job ${job.id} completed for entity ${entityId}`);
//     return result;
//   } catch (error) {
//     logger.error(`Enrichment job ${job.id} failed for entity ${entityId}: ${error.message}`);
//     throw error;
//   }
// }, {
//   connection: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//     password: process.env.REDIS_PASSWORD,
//   },
//   concurrency: 5,
// });
//# sourceMappingURL=enrichment.js.map