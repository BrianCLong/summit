import { Router } from "express";
const r = Router();

r.post("/", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Case" }));
r.get("/", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "CaseList" }));
r.get("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Case" }));
r.patch("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Case" }));
r.delete("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Case" }));

export default r;