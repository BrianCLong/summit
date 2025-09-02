import { Queue, Worker, JobsOptions } from 'bullmq';
import { runCypher } from '../graph/neo4j';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!); // Use Redis connection string from env
const QUEUE = 'assistant:enrich';

export type EnrichJob = {
  reqId: string;
  userId: string | null;
  input: string;
  outputPreview?: string;
  investigationId?: string; // Added for scoping suggestions
  // Optional: full assistant text if you capture it; can expand later
  // fullOutput?: string;
};

export const enrichQueue = new Queue<EnrichJob>(QUEUE, { connection });

export async function enqueueEnrichment(payload: EnrichJob, opts: JobsOptions = { attempts: 2 }) {
  return enrichQueue.add('enrich', payload, opts);
}

// ----- Extremely lightweight NER placeholder (regex-based) -----
// Swap with Python microservice or HF model later; keep interface identical.
function extractEntities(text: string) {
  const ents: { type: string; value: string }[] = [];
  const push = (type: string, v: string) => ents.push({ type, value: v });

  // Naive regex for common entity types
  // Names (capitalized words, potentially multiple) - improved to handle more cases
  (text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3}\b/g) || []).forEach((v) =>
    push('PersonOrOrg', v),
  );
  // Emails
  (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || []).forEach((v) =>
    push('Email', v),
  );
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
    if (text.includes(keyword)) push('Malware', keyword);
  });

  return ents.slice(0, 50); // Limit to 50 entities
}

// Placeholder for calling Python NER service for embeddings
// Placeholder for calling Python NER service for embeddings
async function computeEmbedding(texts: string[]): Promise<number[][]> {
  // In a real scenario, this would call your Python microservice /embed endpoint
  // For now, return dummy embeddings
  return texts.map(() => Array(384).fill(0.1)); // Example: 384-dimensional embeddings for each text
}

// Scoring model for Entity Resolution v2
function scoreEntities(
  suggestionLabel: string,
  candidateName: string,
  candidateEmbedding: number[],
  suggestionEmbedding: number[],
  sharedNeighborsK1: boolean, // Placeholder for graph feature
): number {
  // Features: cosine(name, candidate), JaroWinkler, Levenshtein, same_domain, shared_neighbors_k1, pagerank_delta.
  // Rule baseline:
  // score = 0.6*cosine + 0.2*Jaro + 0.2*(shared_neighbors_k1 ? 1 : 0);
  // accept if score >= 0.82; else queue for review.

  // Dummy cosine similarity (replace with actual calculation if needed)
  const cosineSimilarity = (emb1: number[], emb2: number[]) => {
    if (emb1.length !== emb2.length || emb1.length === 0) return 0;
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
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  };

  const cos = cosineSimilarity(suggestionEmbedding, candidateEmbedding);

  // Jaro-Winkler (placeholder, use a proper library like 'string-similarity' if available)
  const jaroWinkler = (s1: string, s2: string) => {
    // Very basic placeholder, replace with actual Jaro-Winkler
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return longer.indexOf(shorter) !== -1 ? 0.8 : 0.2; // Dummy logic
  };
  const jaro = jaroWinkler(suggestionLabel, candidateName);

  const score = 0.6 * cos + 0.2 * jaro + 0.2 * (sharedNeighborsK1 ? 1 : 0);
  return score;
}

function nowIso() {
  return new Date().toISOString();
}

export const enrichmentWorker = new Worker<EnrichJob>(
  QUEUE,
  async (job) => {
    const { reqId, userId, input, outputPreview, investigationId } = job.data;
    const text = `${input} ${outputPreview ?? ''}`;

    const entities = extractEntities(text);
    const createdAt = nowIso();

    // Batch compute embeddings for all entities
    const entityTexts = entities.map((e) => e.value);
    const entityEmbeddings = await computeEmbedding(entityTexts);

    // Store suggestions as nodes with status=pending; connect provenance
    await runCypher(
      `
    MERGE (r:Request {id: $reqId})
      ON CREATE SET r.createdAt=$createdAt, r.kind='assistant'
    MERGE (u:User {id: coalesce($userId,'anon')})
    MERGE (u)-[:MADE_REQUEST]->(r)
    ${investigationId ? `MERGE (i:Investigation {id: $investigationId}) MERGE (r)-[:PART_OF]->(i)` : ``}
  `,
      { reqId, userId, createdAt, investigationId },
    );

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const suggestionEmbedding = entityEmbeddings[i]; // Get pre-computed embedding
      const label = `${e.type}:${e.value}`;

      // Search for existing entities
      const existingEntities = await runCypher<{ e: { name: string; nameEmbedding: number[] } }>(
        `
      MATCH (e:Entity)
      WHERE e.name IS NOT NULL AND e.nameEmbedding IS NOT NULL
      RETURN e { .name, .nameEmbedding }
      ORDER BY gds.similarity.cosine(e.nameEmbedding, $suggestionEmbedding) DESC
      LIMIT 5
    `,
        { suggestionEmbedding },
      );

      let bestMatch: { entityId: string; score: number } | null = null;
      for (const existing of existingEntities) {
        // Placeholder for shared_neighbors_k1 check
        const sharedNeighborsK1 = false; // Implement actual check if needed

        const score = scoreEntities(
          label,
          existing.e.name,
          existing.e.nameEmbedding,
          suggestionEmbedding,
          sharedNeighborsK1,
        );

        if (score >= 0.82) {
          // Threshold for auto-acceptance
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { entityId: existing.e.name, score }; // Using name as ID for simplicity
          }
        }
      }

      if (bestMatch && process.env.ER_V2 === '1') {
        // If ER_V2 is enabled and a good match found
        // Link to existing entity
        await runCypher(
          `
        CREATE (s:AISuggestion {
          id: apoc.create.uuid(),
          type: 'entity',
          label: $label,
          confidence: $score,
          status: 'auto-linked',
          createdAt: $createdAt
        })
        WITH s
        MATCH (r:Request {id: $reqId})
        MERGE (s)-[:DERIVED_FROM]->(r)
        WITH s
        MATCH (e:Entity {name: $entityName})
        MERGE (s)-[:MATERIALIZED]->(e)
        RETURN s.id AS id
      `,
          { label, score: bestMatch.score, createdAt, reqId, entityName: bestMatch.entityId },
        );
      } else {
        // Create new pending suggestion as before
        await runCypher(
          `
        CREATE (s:AISuggestion {
          id: apoc.create.uuid(),
          type: 'entity',
          label: $label,
          confidence: 0.72,
          status: 'pending',
          createdAt: $createdAt
        })
        WITH s
        MATCH (r:Request {id: $reqId})
        MERGE (s)-[:DERIVED_FROM]->(r)
        RETURN s.id AS id
      `,
          { label, createdAt, reqId },
        );
      }
    }

    return { count: entities.length };
  },
  { connection },
);
