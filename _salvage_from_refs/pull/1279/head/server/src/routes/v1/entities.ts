import { Router } from "express";
const r = Router();

r.post("/", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Entity" }));
r.get("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Entity" }));
r.patch("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Entity" }));

export default r;