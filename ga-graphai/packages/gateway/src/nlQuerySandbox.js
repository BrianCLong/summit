import { randomUUID } from "node:crypto";
import { buildNlQuerySandboxResponse } from "@ga-graphai/query-copilot";

const DEFAULT_SCHEMA = {
  nodes: [
    { label: "Person", properties: ["name", "risk", "location"] },
    { label: "Organization", properties: ["name", "sector"] },
    { label: "Case", properties: ["title", "severity"] },
  ],
  relationships: [
    { type: "EMPLOYED_BY", from: "Person", to: "Organization" },
    { type: "INVOLVED_IN", from: "Person", to: "Case" },
  ],
};

export function registerNlQuerySandbox(app, options = {}) {
  const enabled = process.env.NL_QUERY_SANDBOX === "1" || options.enableSandbox === true;
  if (!enabled) {
    return;
  }
  const schema = options.schema ?? DEFAULT_SCHEMA;
  const maxDepth = options.maxDepth ?? 3;

  app.post("/v1/nl-query/sandbox", (req, res) => {
    const prompt = req.body?.prompt;
    const caseScope = req.body?.caseScope;
    if (!prompt || !caseScope?.caseId) {
      return res.status(400).json({ error: "PROMPT_AND_CASE_REQUIRED" });
    }
    const approvedExecution =
      req.body?.approvedExecution === true || req.body?.approvedExecution === "true";
    const requestId = req.headers["x-request-id"] ?? req.body?.requestId ?? randomUUID();

    try {
      const response = buildNlQuerySandboxResponse({
        prompt,
        schema: req.body?.schema ?? schema,
        caseScope,
        approvedExecution,
        maxDepth,
        sandboxMode: true,
        tenantId: req.aiContext?.tenant ?? "unknown-tenant",
        policy: {
          authorityId: "gateway-nl-sandbox",
          purpose: req.aiContext?.purpose ?? "investigation",
        },
        requestId,
      });
      console.info(
        `[nl-query-sandbox-endpoint] request=${requestId} allow=${response.allowExecute} depth=${response.estimate.depth}`
      );
      res.json({
        requestId,
        cypher: response.cypher,
        params: response.params,
        estimate: response.estimate,
        warnings: response.warnings,
        allowExecute: response.allowExecute,
      });
    } catch (error) {
      console.error(
        `[nl-query-sandbox-endpoint] request=${requestId} error=${
          error instanceof Error ? error.message : "unknown"
        }`
      );
      res.status(400).json({
        error: "SANDBOX_PIPELINE_FAILED",
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  });
}
