import express from "express";
import bodyParser from "body-parser";
import { checkAuthz } from "../../lib/authz";

const app = express();
app.use(bodyParser.json());

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ai-nlq" }));

app.post("/generate", (req, res) => {
  const { natural } = req.body || {};
  if (!natural) return res.status(400).json({ error: "missing natural" });

  checkAuthz({
    subject: {
      id: req.header("x-subject-id") || "anonymous",
      roles: (req.header("x-roles") || "").split(",").filter(Boolean),
      tenant: req.header("x-tenant") || "unknown",
      clearance: req.header("x-clearance") || "internal",
      mfa: req.header("x-mfa") || "unknown",
    },
    resource: {
      type: "nlq-query",
      id: "preview",
      tenant: req.header("x-tenant") || "unknown",
      classification: req.header("x-resource-classification") || "internal",
    },
    action: "graph:query",
    context: {
      env: req.header("x-env") || "dev",
      request_ip: req.ip,
      time: new Date().toISOString(),
      risk: req.header("x-risk") || "low",
      reason: req.header("x-reason") || "nlq",
      warrant_id: req.header("x-warrant-id") || undefined,
    },
  })
    .then((decision) => {
      if (!decision.allow) {
        return res.status(403).json({ error: "forbidden", reasons: decision.deny });
      }

      const cypher = "MATCH (n) RETURN n LIMIT 10"; // placeholder
      return res.json({ cypher, reasoning: "fallback template", cost_est: { nodes: 10, hops: 1 }, preview_sample: [{ id: "n1" }] });
    })
    .catch((error: Error) => res.status(503).json({ error: error.message }));
});

app.listen(process.env.PORT || 8080);
