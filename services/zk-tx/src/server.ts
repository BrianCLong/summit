import express from "express";
import body from "body-parser";
import crypto from "crypto";

const app = express();
app.use(body.json());

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "zk-tx" }));

app.post("/zk/overlap", (req, res) => {
  const { selectorA, selectorB } = req.body || {};
  if (!selectorA || !selectorB) return res.status(400).json({ error: "missing selectors" });
  const overlap =
    crypto.createHash("sha256").update(selectorA).digest("hex")[0] ===
    crypto.createHash("sha256").update(selectorB).digest("hex")[0];
  return res.json({ overlap, proof: "stub" });
});

app.listen(process.env.PORT || 8080);
