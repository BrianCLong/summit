import { Router } from "express";

export const decisionRouter = Router();

decisionRouter.post("/admit", (req, res) => {
  res.json({ ok: true, status: { allowed: true, phase: "Admitted" } });
});

decisionRouter.post("/reconcile", (req, res) => {
  res.json({ ok: true, status: { phase: "Admitted" } });
});

decisionRouter.get("/:id/status", (req, res) => {
  res.json({ ok: true, id: req.params.id, status: { phase: "Pending" } });
});
