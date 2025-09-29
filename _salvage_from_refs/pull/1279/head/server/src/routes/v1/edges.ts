import { Router } from "express";
const r = Router();

r.post("/", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Edge" }));
r.delete("/:id", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "Edge" }));

export default r;