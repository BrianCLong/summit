import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "policy-compiler" }));

app.post("/decide", (req, res) => {
  const { query, caller } = req.body || {};
  if (!query) return res.status(400).json({ allow: false, reason: "missing query" });
  if ((caller && caller.purpose) === "investigation" && !/mutation|export/i.test(query)) {
    return res.json({ allow: true, reason: "allow: read for investigation" });
  }
  return res.status(403).json({ allow: false, reason: "deny: policy default" });
});

app.listen(process.env.PORT || 8080);
