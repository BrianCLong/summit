import { AIBroker } from "../../ai/broker";
import { VertexAIProvider } from "../../ai/providers/vertex";
import { getCtx } from "../util/context";
import { buildNLToCypherPrompt, buildNarrativePrompt } from "../../prompts";

const broker = new AIBroker({
  "vertex-ai": new VertexAIProvider({
    projectId: process.env.GCP_PROJECT!,
    location: process.env.VERTEX_LOCATION || "us-central1",
    models: { chat: process.env.VERTEX_CHAT_MODEL || "gemini-1.5-pro", embed: process.env.VERTEX_EMBED_MODEL || "text-embedding-004" },
    vectorIndex: process.env.VERTEX_VECTOR_ENABLED === "true" ? {
      enabled: true,
      endpoint: process.env.VERTEX_INDEX_RESOURCE!, // doc-only, see TF below
      datapointEndpoint: process.env.VERTEX_UPSERT_ENDPOINT!,
      queryEndpoint: process.env.VERTEX_QUERY_ENDPOINT!,
      nsPrefix: "case"
    } : undefined
  })
});

export default {
  Mutation: {
    nlToCypher: async (_: any, { prompt, caseId }: { prompt: string, caseId: string }, ctx: any) => {
      const c = getCtx(ctx, caseId);
      const sys = buildNLToCypherPrompt();
      const res = await broker.chat(c, [{ role: "system", content: sys }, { role: "user", content: prompt }], { temperature: 0.0 });
      return { ...res };
    },
    draftNarrative: async (_: any, { instructions, caseId }: { instructions: string, caseId: string }, ctx: any) => {
      const c = getCtx(ctx, caseId);
      const sys = buildNarrativePrompt();
      const res = await broker.chat(c, [{ role: "system", content: sys }, { role: "user", content: instructions }], { temperature: 0.2 });
      return { ...res };
    }
  },
  Query: {
    ragAsk: async (_: any, { question, caseId, k }: { question: string, caseId: string, k: number }, ctx: any) => {
      const c = getCtx(ctx, caseId);
      const hits = await broker.ragSearch(c, question, k);
      // Optional: call LLM to synthesize with inline cites
      const contextBlocks = hits.matches.map(m => `[#${m.docId}] (${m.score.toFixed(3)}): ${m.title || ""}`).join("\n");
      const sys = "You answer strictly from provided context, add bracketed citation ids like [#docId].";
      const res = await broker.chat(c, [
        { role: "system", content: sys },
        { role: "user", content: `Context:\n${contextBlocks}\n\nQuestion: ${question}\nAnswer with citations.` }
      ], { temperature: 0.1 });
      return { answer: res.text, citations: hits.matches.map(m => ({ docId: m.docId, chunkId: m.chunkId, score: m.score, title: m.title })), model: res.model, provenanceId: (res as any).provenanceId };
    }
  }
};
