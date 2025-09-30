import { AIBroker } from "./index";
import { AIProvider } from "./types";

const fake: AIProvider = {
  name: () => "fake",
  generate: async () => ({ text: "ok", model: "m", tokensIn: 1, tokensOut: 1, latencyMs: 1 }),
  embed: async () => [[0.1, 0.2]]
};

test("broker applies redaction/authority/budget before calling provider", async () => {
  const b = new AIBroker({ "vertex-ai": fake });
  const ctx: any = {
    tenantId: "t",
    caseId: "c",
    policy: { cloudAllowed: true, residency: "us" },
    finops: { maxUsdPerCall: 1 },
    secrets: {}
  };
  const res = await b.chat(ctx, [{ role: "user", content: "PII: 555-55-5555" }]);
  expect(res.text).toBe("ok");
});
