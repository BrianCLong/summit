import axios from "axios";
import { GoogleAuth } from "google-auth-library";
import { AIMessage, AIProvider, GenerateOptions, AIGenerateResult, EmbedOptions, VectorDoc, AIVectorSearchResult } from "../broker/types";
import pRetry from "p-retry";

type Cfg = {
  projectId: string;
  location: string; // e.g., "us-central1", "europe-west1"
  models: {
    chat: string;    // "gemini-1.5-pro"
    embed: string;   // "text-embedding-004"
  };
  vectorIndex?: {   // optional Vertex Vector Search
    enabled: boolean;
    endpoint: string;       // e.g., "projects/.../locations/.../indexes/{indexId}"
    datapointEndpoint: string; // ".../indexEndpoints/{endpointId}:upsertDatapoints"
    queryEndpoint: string;     // ".../indexEndpoints/{endpointId}:findNeighbors"
    nsPrefix?: string; // per-case namespace prefix
  };
};

export class VertexAIProvider implements AIProvider {
  private cfg: Cfg;
  constructor(cfg: Cfg) { this.cfg = cfg; }

  name() { return "vertex-ai"; }

  private async token() {
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const t = await client.getAccessToken();
    return t.token!;
  }

  async generate(messages: AIMessage[], opts?: GenerateOptions): Promise<AIGenerateResult> {
    const url = `https://${this.cfg.location}-aiplatform.googleapis.com/v1/projects/${this.cfg.projectId}/locations/${this.cfg.location}/publishers/google/models/${opts?.model || this.cfg.models.chat}:generateContent`;

    const contents = messages.map(m => ({ role: m.role === "system" ? "user" : m.role, parts: [{ text: m.content }] }));
    const started = Date.now();
    const doCall = async () => {
      const { data } = await axios.post(url, {
        contents,
        generationConfig: {
          temperature: opts?.temperature ?? 0.2,
          topP: opts?.topP ?? 0.95,
          maxOutputTokens: opts?.maxOutputTokens ?? 1024
        },
        safetySettings: opts?.safetySettings || []
      }, { headers: { Authorization: `Bearer ${await this.token()}` } });
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      const usage = data.usageMetadata || {};
      return {
        text,
        model: opts?.model || this.cfg.models.chat,
        tokensIn: usage.promptTokenCount ?? 0,
        tokensOut: usage.candidatesTokenCount ?? 0,
        latencyMs: Date.now() - started,
        raw: data
      } as AIGenerateResult;
    };

    return await pRetry(doCall, { retries: 2, factor: 2, minTimeout: 250 });
  }

  async embed(texts: string[], opts?: EmbedOptions): Promise<number[][]> {
    const model = opts?.model || this.cfg.models.embed;
    const url = `https://${this.cfg.location}-aiplatform.googleapis.com/v1/projects/${this.cfg.projectId}/locations/${this.cfg.location}/publishers/google/models/${model}:embedContent`;

    // Vertex supports batching by concatenation; we do one-by-one for clarity + provenance
    const token = await this.token();
    const results: number[][] = [];
    for (const t of texts) {
      const { data } = await axios.post(url, { content: { parts: [{ text: t }] } }, { headers: { Authorization: `Bearer ${token}` } });
      results.push(data.embedding?.values || data.embeddings?.values || []);
    }
    return results;
  }

  async vectorUpsert(caseId: string, docs: VectorDoc[]): Promise<void> {
    if (!this.cfg.vectorIndex?.enabled) return;
    const ns = (this.cfg.vectorIndex.nsPrefix || "case") + ":" + caseId;
    const token = await this.token();
    const upsertUrl = `https://${this.cfg.location}-aiplatform.googleapis.com/v1/${this.cfg.vectorIndex.datapointEndpoint}`;
    const datapoints = docs.map(d => ({
      datapointId: `${ns}:${d.id}`,
      featureVector: d.embedding,
      restricts: [{ namespace: "case", allowList: [caseId] }],
      crowdingTag: d.metadata?.type || "doc",
      // optional: "attributes" for metadata
    }));
    await axios.post(upsertUrl, { datapoints }, { headers: { Authorization: `Bearer ${token}` } });
  }

  async vectorSearch(caseId: string, query: string, k: number): Promise<AIVectorSearchResult> {
    if (!this.cfg.vectorIndex?.enabled) throw new Error("Vector search disabled");
    const [qvec] = await this.embed([query]);
    const token = await this.token();
    const findUrl = `https://${this.cfg.location}-aiplatform.googleapis.com/v1/${this.cfg.vectorIndex.queryEndpoint}`;
    const ns = (this.cfg.vectorIndex.nsPrefix || "case") + ":" + caseId;

    const { data } = await axios.post(findUrl, {
      deployedIndexId: this.cfg.vectorIndex.endpoint.split("/").pop(),
      queries: [{
        neighborCount: k,
        queryVector: qvec,
        allowRestricts: [{ namespace: "case", allowList: [caseId] }],
        perCrowdingAttributeNeighborCount: 0,
        fractionLeafNodesToSearchOverride: 0.05
      }]
    }, { headers: { Authorization: `Bearer ${token}` } });

    const matches = (data.nearestNeighbors?.[0]?.neighbors || []).map((n: any) => {
      const id = n.datapoint?.datapointId || "";
      const [_, docId] = id.split(`${ns}:`);
      return { docId: docId || id, chunkId: id, score: n.distance || 0, title: n.datapoint?.attributes?.title };
    });
    return { matches };
  }
}
