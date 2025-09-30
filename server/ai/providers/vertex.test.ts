import nock from "nock";
import { VertexAIProvider } from "./vertex";

describe("VertexAIProvider.generate", () => {
  it("returns text and usage even when candidates parts are multiple", async () => {
    const p = new VertexAIProvider({
      projectId: "p", location: "us-central1",
      models: { chat: "gemini-1.5-pro", embed: "text-embedding-004" }
    } as any);

    // Mock token
    (p as any).token = async () => "tkn";
    nock("https://us-central1-aiplatform.googleapis.com")
      .post(/generateContent/)
      .reply(200, { candidates: [{ content: { parts: [{ text: "MATCH (n) RETURN n LIMIT 10" }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });

    const res = await p.generate([{ role: "user", content: "list nodes" }]);
    expect(res.text).toContain("MATCH");
    expect(res.tokensIn).toBe(10);
    expect(res.tokensOut).toBe(5);
  });
});
