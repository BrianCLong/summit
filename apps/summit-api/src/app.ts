import express from "express";
import { culturalRouter } from "./routes/cultural.js";

export function buildApp() {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/cultural", culturalRouter);

  return app;
}
