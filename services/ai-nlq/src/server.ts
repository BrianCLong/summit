import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ai-nlq" }));

app.post("/generate", (req, res) => {
  const { natural } = req.body || {};
  if (!natural) return res.status(400).json({ error: "missing natural" });
  const cypher = "MATCH (n) RETURN n LIMIT 10"; // placeholder
  return res.json({ cypher, reasoning: "fallback template", cost_est: { nodes: 10, hops: 1 }, preview_sample: [{ id: "n1" }] });
});

app.listen(process.env.PORT || 8080);
