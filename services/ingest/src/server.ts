import express from "express";
import fileUpload from "express-fileupload";

const app = express();
app.use(fileUpload());

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ingest" }));

app.post("/map/csv", (req, res) => {
  if (!req.files) return res.status(400).json({ error: "file required" });
  return res.json({ entities: ["Person", "Org"], fieldsMapped: 5, lineageId: "lin_" + Date.now() });
});

app.listen(process.env.PORT || 8080);
