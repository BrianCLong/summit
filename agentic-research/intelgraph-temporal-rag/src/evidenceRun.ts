import { temporalRetrieve, BaseRetriever } from "./temporalRetriever";
import { TemporalDoc } from "./temporalRerank";
import { writeEvidence } from "../../shared/src/evidence";

class MockRetriever implements BaseRetriever {
  async search(query: string, k: number): Promise<TemporalDoc[]> {
    return [
      { id: "d1", text: "old doc", publishedAt: "2020-01-01T00:00:00Z", simScore: 0.9 },
      { id: "d2", text: "new doc", publishedAt: new Date().toISOString(), simScore: 0.8 },
    ];
  }
}

export async function runEvidence(evid: string) {
  const base = new MockRetriever();
  const query = "latest news";
  const now = new Date();

  const results = await temporalRetrieve(base, query, 5, now);

  writeEvidence(
    evid,
    { query, topResult: results[0] },
    { score: results[0].fused, recency: results[0].recency },
    { module: "intelgraph-temporal-rag", date_utc: now.toISOString() }
  );
}
