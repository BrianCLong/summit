import express, { Request, Response } from "express";
import path from "path";
import { Context } from "./policy-engine";
import { discoverPolicies, mergePolicies, explainDecision, diffPolicies } from "./policy-store";

const app = express();
app.use(express.json());

const POLICY_DIR = process.env.LAC_POLICY_DIR || path.join(__dirname, "..", "policies", "examples");
let cachedPolicy = mergePolicies(discoverPolicies(POLICY_DIR));

function validateContext(body: any): asserts body is Context {
  if (!body || typeof body.action !== "string" || typeof body.resource !== "string") {
    throw new Error("Invalid context: action and resource are required strings");
  }
  if (!body.attributes || typeof body.attributes !== "object") {
    body.attributes = {};
  }
}

app.post("/policy/explain", (req: Request, res: Response) => {
  try {
    validateContext(req.body);
    const decision = explainDecision(cachedPolicy, req.body);
    res.json({ ...decision, policyVersion: cachedPolicy.version });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid request" });
  }
});

app.post("/policy/reload", (_req, res) => {
  cachedPolicy = mergePolicies(discoverPolicies(POLICY_DIR));
  res.json({ ok: true, rules: cachedPolicy.rules.length });
});

app.post("/policy/diff", (req, res) => {
  try {
    const { leftPath, rightPath } = req.body || {};
    if (typeof leftPath !== "string" || typeof rightPath !== "string") {
      throw new Error("leftPath and rightPath are required");
    }
    const left = mergePolicies(discoverPolicies(path.dirname(leftPath)));
    const right = mergePolicies(discoverPolicies(path.dirname(rightPath)));
    res.json(diffPolicies(left, right));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid request" });
  }
});

app.get("/health", (_req, res) => res.send("ok"));

export function startServer() {
  const port = Number(process.env.PORT || 4000);
  return app.listen(port, () => console.log(`[policy-lac] listening on ${port}`));
}

if (require.main === module) {
  startServer();
}

export default app;
