import { Router } from "express";
const r = Router();

r.get("/", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString(), service: "summit-api" });
});

export default r;